from flask import Blueprint, jsonify
from api.models_loader import get_metadata, get_load_time, get_uptime, is_loaded, ENCODINGS
from api.config import AppConfig

health_bp = Blueprint("health", __name__)

INJURY_INFO = {
    "acl_tear":{"name":"ACL Tear","rom_max":140,"fast_days":180,"normal_days":270,"slow_days":365},
    "pcl_tear":{"name":"PCL Tear","rom_max":135,"fast_days":180,"normal_days":270,"slow_days":365},
    "mcl_tear":{"name":"MCL Tear","rom_max":140,"fast_days":42,"normal_days":84,"slow_days":120},
    "lcl_tear":{"name":"LCL Tear","rom_max":135,"fast_days":56,"normal_days":90,"slow_days":150},
    "meniscus_tear":{"name":"Meniscus Tear","rom_max":140,"fast_days":42,"normal_days":90,"slow_days":150},
    "knee_replacement":{"name":"Knee Replacement","rom_max":120,"fast_days":84,"normal_days":168,"slow_days":270},
    "patellar_tendon":{"name":"Patellar Tendon Repair","rom_max":130,"fast_days":120,"normal_days":180,"slow_days":270},
    "knee_fracture":{"name":"Knee Fracture","rom_max":130,"fast_days":90,"normal_days":150,"slow_days":240},
    "osteoarthritis":{"name":"Knee Osteoarthritis","rom_max":120,"fast_days":60,"normal_days":120,"slow_days":180},
    "knee_dislocation":{"name":"Knee Dislocation","rom_max":125,"fast_days":120,"normal_days":210,"slow_days":330},
}

@health_bp.route("/api/health")
def health():
    return jsonify({
        "status":"ok" if is_loaded() else "loading",
        "project":AppConfig.APP_NAME,
        "num_models":6,
        "models_loaded":is_loaded(),
        "load_time_seconds":get_load_time(),
        "uptime_seconds":get_uptime(),
        "version":get_metadata().get("model_version","unknown") if get_metadata() else "unknown",
    })

@health_bp.route("/api/metadata")
def metadata():
    m = get_metadata()
    if not m:
        return jsonify({"error":"Models not loaded"}), 503
    return jsonify(m)

@health_bp.route("/api/encodings")
def encodings():
    return jsonify(ENCODINGS)

@health_bp.route("/api/injuries")
def injuries():
    return jsonify(INJURY_INFO)
