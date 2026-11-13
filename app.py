from datetime import date
import os

from flask import Flask, render_template, request, jsonify
from flask_sqlalchemy import SQLAlchemy


# ========================================
# 1. FLASK APPLICATION SETUP
# ========================================

app = Flask(__name__)

database_url = os.environ.get("DATABASE_URL")

if database_url:
    if database_url.startswith("postgres://"):
        database_url = database_url.replace(
            "postgres://",
            "postgresql://",
            1
        )

    app.config["SQLALCHEMY_DATABASE_URI"] = database_url

else:
    app.config["SQLALCHEMY_DATABASE_URI"] = "sqlite:///parcelmate.db"

app.config["SQLALCHEMY_TRACK_MODIFICATIONS"] = False

db = SQLAlchemy(app)


# ========================================
# 2. PARCEL DATABASE MODEL
# ========================================

class Parcel(db.Model):

    id = db.Column(db.Integer, primary_key=True)

    tracking_id = db.Column(
        db.String(100),
        unique=True,
        nullable=False
    )

    courier_name = db.Column(
        db.String(100),
        nullable=False
    )

    delivery_date = db.Column(
        db.String(20),
        nullable=False
    )

    address = db.Column(
        db.String(300),
        nullable=False
    )

    parcel_status = db.Column(
        db.String(50),
        nullable=False
    )


VALID_STATUSES = [
    "In Transit",
    "Out for Delivery",
    "Delivered"
]


# ========================================
# 3. PARCEL DATA VALIDATION
# ========================================

def validate_parcel_data(data, existing_parcel=None):

    tracking_id = data.get("tracking_id", "").strip()
    courier_name = data.get("courier_name", "").strip()
    delivery_date = data.get("delivery_date", "").strip()
    address = data.get("address", "").strip()
    parcel_status = data.get("parcel_status", "").strip()

    if not all([
        tracking_id,
        courier_name,
        delivery_date,
        address,
        parcel_status
    ]):
        return None, "Please fill in all fields."

    if len(tracking_id) > 100:
        return None, "Tracking ID is too long."

    if len(courier_name) > 100:
        return None, "Courier name is too long."

    if len(address) > 300:
        return None, "Address is too long."

    if parcel_status not in VALID_STATUSES:
        return None, "Please select a valid parcel status."

    try:
        parsed_date = date.fromisoformat(delivery_date)

    except ValueError:
        return None, "Please enter a valid delivery date."

    if parsed_date < date.today():
        return None, "Delivery date cannot be in the past."

    duplicate = Parcel.query.filter_by(
        tracking_id=tracking_id
    ).first()

    if duplicate and (
        existing_parcel is None
        or duplicate.id != existing_parcel.id
    ):
        return None, "This tracking ID already exists."

    return {
        "tracking_id": tracking_id,
        "courier_name": courier_name,
        "delivery_date": delivery_date,
        "address": address,
        "parcel_status": parcel_status
    }, None


# ========================================
# 4. CONVERT PARCEL TO DICTIONARY
# ========================================

def parcel_to_dict(parcel):

    return {
        "id": parcel.id,
        "trackingId": parcel.tracking_id,
        "courierName": parcel.courier_name,
        "deliveryDate": parcel.delivery_date,
        "address": parcel.address,
        "parcelStatus": parcel.parcel_status
    }


# ========================================
# 5. HOME PAGE / DASHBOARD
# ========================================

@app.route("/")
def home():

    parcels = Parcel.query.order_by(
        Parcel.id.desc()
    ).all()

    parcel_list = [
        parcel_to_dict(parcel)
        for parcel in parcels
    ]

    return render_template(
        "index.html",
        parcels=parcel_list
    )


# ========================================
# 6. SETTINGS PAGE
# ========================================

@app.route("/settings")
def settings():

    return render_template("settings.html")


# ========================================
# 7. ADD NEW PARCEL
# ========================================

@app.route("/add-parcel", methods=["POST"])
def add_parcel():

    data, error = validate_parcel_data(request.form)

    if error:
        return jsonify({
            "success": False,
            "message": error
        }), 400

    new_parcel = Parcel(**data)

    try:

        db.session.add(new_parcel)
        db.session.commit()

        return jsonify({
            "success": True,
            "message": "Parcel added successfully!",
            "parcel": parcel_to_dict(new_parcel)
        }), 201

    except Exception:

        db.session.rollback()
        app.logger.exception("Error adding parcel")

        return jsonify({
            "success": False,
            "message": "Could not save the parcel."
        }), 500


# ========================================
# 8. UPDATE EXISTING PARCEL
# ========================================

@app.route("/update-parcel/<int:parcel_id>", methods=["POST"])
def update_parcel(parcel_id):

    parcel = db.session.get(Parcel, parcel_id)

    if parcel is None:
        return jsonify({
            "success": False,
            "message": "Parcel not found."
        }), 404

    data, error = validate_parcel_data(
        request.form,
        existing_parcel=parcel
    )

    if error:
        return jsonify({
            "success": False,
            "message": error
        }), 400

    parcel.tracking_id = data["tracking_id"]
    parcel.courier_name = data["courier_name"]
    parcel.delivery_date = data["delivery_date"]
    parcel.address = data["address"]
    parcel.parcel_status = data["parcel_status"]

    try:

        db.session.commit()

        return jsonify({
            "success": True,
            "message": "Parcel updated successfully!",
            "parcel": parcel_to_dict(parcel)
        })

    except Exception:

        db.session.rollback()
        app.logger.exception("Error updating parcel")

        return jsonify({
            "success": False,
            "message": "Could not update the parcel."
        }), 500


# ========================================
# 9. DELETE PARCEL
# ========================================

@app.route("/delete-parcel/<int:parcel_id>", methods=["POST"])
def delete_parcel(parcel_id):

    parcel = db.session.get(Parcel, parcel_id)

    if parcel is None:
        return jsonify({
            "success": False,
            "message": "Parcel not found."
        }), 404

    try:

        db.session.delete(parcel)
        db.session.commit()

        return jsonify({
            "success": True,
            "message": "Parcel deleted successfully!"
        })

    except Exception:

        db.session.rollback()
        app.logger.exception("Error deleting parcel")

        return jsonify({
            "success": False,
            "message": "Could not delete the parcel."
        }), 500


# ========================================
# 10. IMPORT OLD PARCELS
# ========================================

@app.route("/import-old-parcels", methods=["POST"])
def import_old_parcels():

    old_parcels = request.get_json(silent=True)

    if not isinstance(old_parcels, list):
        return jsonify({
            "success": False,
            "message": "Invalid parcel data."
        }), 400

    imported_count = 0

    for item in old_parcels:

        if not isinstance(item, dict):
            continue

        tracking_id = str(
            item.get("trackingId", "")
        ).strip()

        courier_name = str(
            item.get("courierName", "")
        ).strip()

        delivery_date = str(
            item.get("deliveryDate", "")
        ).strip()

        address = str(
            item.get("address", "")
        ).strip()

        parcel_status = str(
            item.get("parcelStatus", "")
        ).strip()

        if not all([
            tracking_id,
            courier_name,
            delivery_date,
            address,
            parcel_status
        ]):
            continue

        if parcel_status not in VALID_STATUSES:
            continue

        try:
            parsed_date = date.fromisoformat(delivery_date)

        except ValueError:
            continue

        if parsed_date < date.today():
            continue

        existing = Parcel.query.filter_by(
            tracking_id=tracking_id
        ).first()

        if existing:
            continue

        new_parcel = Parcel(
            tracking_id=tracking_id,
            courier_name=courier_name,
            delivery_date=delivery_date,
            address=address,
            parcel_status=parcel_status
        )

        db.session.add(new_parcel)
        imported_count += 1

    try:

        db.session.commit()

        return jsonify({
            "success": True,
            "imported": imported_count,
            "message": f"{imported_count} parcel(s) imported."
        })

    except Exception:

        db.session.rollback()
        app.logger.exception("Error importing parcels")

        return jsonify({
            "success": False,
            "message": "Could not import parcels."
        }), 500


# ========================================
# 11. SERVICE WORKER ROUTE
# ========================================

@app.route("/service-worker.js")
def service_worker():

    response = app.send_static_file("service-worker.js")

    response.headers["Service-Worker-Allowed"] = "/"

    return response


# ========================================
# 12. START APPLICATION
# ========================================

with app.app_context():
    db.create_all()


if __name__ == "__main__":
    app.run(debug=True)