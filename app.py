from flask import Flask, render_template, request, jsonify
from flask_sqlalchemy import SQLAlchemy
from flask_bcrypt import Bcrypt
from flask_jwt_extended import JWTManager, create_access_token, jwt_required, get_jwt_identity
import os

app = Flask(__name__)

# Настройки
BASE_DIR = os.path.abspath(os.path.dirname(__file__))
app.config['SQLALCHEMY_DATABASE_URI'] = f"sqlite:///{os.path.join(BASE_DIR, 'pixelbattle.db')}"
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
app.config['JWT_SECRET_KEY'] = 'zxc322'  #безопасный ключ

db = SQLAlchemy(app)
bcrypt = Bcrypt(app)
jwt = JWTManager(app)

class Pixel(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    x = db.Column(db.Integer, nullable=False)
    y = db.Column(db.Integer, nullable=False)
    color = db.Column(db.String(7), nullable=False)
    user = db.Column(db.String(50), nullable=True)

class User(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(50), unique=True, nullable=False)
    password_hash = db.Column(db.String(128), nullable=False)
    rating = db.Column(db.Integer, default=0)





@app.route('/clear_pixels', methods=['POST'])
@jwt_required()
def clear_pixels():
    username = get_jwt_identity()
    if username != "admin":
        return jsonify({'error': 'Access denied'}), 403

    Pixel.query.delete()
    db.session.commit()
    return jsonify({'message': 'Pixel database cleared successfully'})

@app.route('/delete_user', methods=['POST'])
@jwt_required()
def delete_user():
    username = get_jwt_identity()
    if username != "admin":
        return jsonify({'error': 'Access denied'}), 403

    data = request.get_json()
    user_to_delete = User.query.filter_by(username=data['username']).first()

    if not user_to_delete:
        return jsonify({'error': 'User not found'}), 404

    db.session.delete(user_to_delete)
    db.session.commit()
    return jsonify({'message': f'User {data["username"]} deleted successfully'})




@app.route('/register', methods=['POST'])
def register():
    data = request.get_json()
    username = data['username']
    password = data['password']

    if User.query.filter_by(username=username).first():
        return jsonify({'error': 'Username already exists'}), 400

    hashed_password = bcrypt.generate_password_hash(password).decode('utf-8')
    user = User(username=username, password_hash=hashed_password)
    db.session.add(user)
    db.session.commit()

    access_token = create_access_token(identity=username)
    return jsonify({'message': 'User registered successfully', 'token': access_token})


@app.route('/login', methods=['POST'])
def login():
    data = request.get_json()
    username = data['username']
    password = data['password']

    user = User.query.filter_by(username=username).first()
    if not user or not bcrypt.check_password_hash(user.password_hash, password):
        return jsonify({'error': 'Invalid username or password'}), 401

    access_token = create_access_token(identity=username)
    return jsonify({'token': access_token})



@app.route('/set_pixel', methods=['POST'])
@jwt_required()
def set_pixel():
    username = get_jwt_identity()
    data = request.get_json()
    x, y, color = data['x'], data['y'], data['color']

    pixel = Pixel.query.filter_by(x=x, y=y).first()
    if pixel:
        pixel.color = color
        pixel.user = username
    else:
        pixel = Pixel(x=x, y=y, color=color, user=username)
        db.session.add(pixel)

    db.session.commit()
    return jsonify({'status': 'success', 'user': username})



@app.route('/get_pixels', methods=['GET'])
def get_pixels():
    pixels = Pixel.query.all()
    return jsonify([
        {'x': pixel.x, 'y': pixel.y, 'color': pixel.color, 'user': pixel.user} for pixel in pixels
    ])

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/admin', methods=['GET', 'POST'])
@jwt_required()
def admin_panel():
    username = get_jwt_identity()
    if username != "admin":
        return jsonify({'error': 'Access denied'}), 403

    return render_template('admin.html')


if __name__ == '__main__':
    with app.app_context():
        db.create_all()
    app.run(host='0.0.0.0', debug=True)
