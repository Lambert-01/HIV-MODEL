from flask import Flask, Response, render_template, request

from routes.export_routes import export_bp
from routes.health_routes import health_bp
from routes.simulation_routes import simulation_bp


def create_app():
    app = Flask(__name__)
    app.register_blueprint(health_bp)
    app.register_blueprint(simulation_bp)
    app.register_blueprint(export_bp)

    @app.context_processor
    def inject_request():
        return {"request": request}

    @app.get("/")
    def home():
        return render_template("index.html")

    @app.get("/dashboard")
    def dashboard():
        return render_template("dashboard.html")

    @app.get("/documentation")
    def documentation():
        return render_template("documentation.html")

    @app.get("/about")
    def about():
        return render_template("about.html")

    @app.get("/favicon.ico")
    def favicon():
        return Response(status=204)

    return app


if __name__ == "__main__":
    create_app().run(debug=True, use_reloader=False, host="127.0.0.1", port=5000)
