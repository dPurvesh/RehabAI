import pandas as pd
import numpy as np
import os, json, sys, warnings, joblib
warnings.filterwarnings("ignore")
sys.stdout.reconfigure(encoding="utf-8")

from sklearn.ensemble import RandomForestClassifier, RandomForestRegressor
from sklearn.metrics import (accuracy_score, f1_score, classification_report,
    confusion_matrix, r2_score, mean_absolute_error, mean_squared_error)
import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
import seaborn as sns

print("="*60)
print("  KneeRevive AI - ML Model Training")
print("="*60)

# ============ LOAD DATA ============
print("\n[*] Loading datasets...")
train_df = pd.read_csv("data/train.csv")
val_df = pd.read_csv("data/validation.csv")
test_df = pd.read_csv("data/test.csv")
print(f"   Train: {len(train_df)} | Val: {len(val_df)} | Test: {len(test_df)}")

# ============ FEATURES ============
INPUT_FEATURES = [
    "age","gender_enc","weight_kg","height_cm","bmi",
    "injury_type_enc","surgery_type_enc","severity_enc","comorbidity_enc","activity_enc",
    "graft_type_enc","affected_side_enc",
    "day_number","pain_level","swelling_level","stiffness_level",
    "exercises_completed_percent","exercise_duration_mins","exercise_difficulty","steps_walked",
    "sleep_hours","sleep_quality","times_woken_up","rested_feeling",
    "fatigue_level","mood_score","medication_taken","physio_session_today",
    "independence_level","ice_applied_today",
    "range_of_motion_flexion","range_of_motion_extension",
    "muscle_strength_score","balance_score","gait_status_enc","functional_mobility_score",
    "quad_activation_score","brace_status_enc",
    "pain_trend_7day","exercise_trend_7day","sleep_trend_7day","in_relapse",
]

TARGETS = {
    "recovery_score":    {"type":"regression",  "col":"recovery_score",    "name":"Recovery Score"},
    "risk_level":        {"type":"classification","col":"risk_level_enc",  "name":"Risk Level",     "labels":["LOW","MEDIUM","HIGH"]},
    "recovery_rate":     {"type":"classification","col":"recovery_rate_enc","name":"Recovery Rate", "labels":["SLOW","NORMAL","FAST"]},
    "days_remaining":    {"type":"regression",  "col":"days_remaining",    "name":"Days Remaining"},
    "physio_alert":      {"type":"binary",      "col":"physio_alert",      "name":"Physio Alert",   "labels":["NO ALERT","ALERT"]},
    "rehab_phase":       {"type":"classification","col":"rehab_phase_enc", "name":"Rehab Phase",    "labels":["PROTECTION","MOBILITY","STRENGTHENING","FUNCTIONAL"]},
}

X_train = train_df[INPUT_FEATURES]
X_val = val_df[INPUT_FEATURES]
X_test = test_df[INPUT_FEATURES]

assert X_train.isnull().sum().sum() == 0, "Nulls in train!"
assert X_val.isnull().sum().sum() == 0, "Nulls in val!"
print(f"   Features: {len(INPUT_FEATURES)} | No nulls")

os.makedirs("models", exist_ok=True)
os.makedirs("plots", exist_ok=True)
os.makedirs("reports", exist_ok=True)

# ============ TRAIN ALL MODELS ============
results = {}

for model_key, cfg in TARGETS.items():
    print(f"\n{'='*60}")
    print(f"  Training: {cfg['name']} ({cfg['type']})")
    print(f"{'='*60}")

    y_train = train_df[cfg["col"]]
    y_val = val_df[cfg["col"]]
    y_test = test_df[cfg["col"]]

    if cfg["type"] == "regression":
        model = RandomForestRegressor(n_estimators=200, oob_score=True, n_jobs=-1, random_state=42, max_depth=25)
        model.fit(X_train, y_train)

        val_pred = model.predict(X_val)
        test_pred = model.predict(X_test)

        val_r2 = round(r2_score(y_val, val_pred), 4)
        val_mae = round(mean_absolute_error(y_val, val_pred), 2)
        test_r2 = round(r2_score(y_test, test_pred), 4)
        test_mae = round(mean_absolute_error(y_test, test_pred), 2)
        test_rmse = round(np.sqrt(mean_squared_error(y_test, test_pred)), 2)

        results[model_key] = {"type":"regression","val_r2":val_r2,"val_mae":val_mae,
            "test_r2":test_r2,"test_mae":test_mae,"test_rmse":test_rmse,"oob_score":round(model.oob_score_,4)}

        print(f"   Val  -> R2={val_r2}, MAE={val_mae}")
        print(f"   Test -> R2={test_r2}, MAE={test_mae}, RMSE={test_rmse}")
        print(f"   OOB  -> {model.oob_score_:.4f}")

        # Plot: actual vs predicted
        fig, ax = plt.subplots(1, 1, figsize=(8, 6))
        ax.scatter(y_test, test_pred, alpha=0.3, s=10, c='#6366f1')
        ax.plot([y_test.min(), y_test.max()], [y_test.min(), y_test.max()], 'r--', lw=2)
        ax.set_xlabel("Actual"); ax.set_ylabel("Predicted")
        ax.set_title(f"{cfg['name']} - Actual vs Predicted (R2={test_r2})")
        plt.tight_layout(); plt.savefig(f"plots/{model_key}_scatter.png", dpi=150); plt.close()

    else:
        model = RandomForestClassifier(n_estimators=200, oob_score=True, n_jobs=-1, random_state=42, max_depth=25)
        model.fit(X_train, y_train)

        val_pred = model.predict(X_val)
        test_pred = model.predict(X_test)

        val_acc = round(accuracy_score(y_val, val_pred), 4)
        val_f1 = round(f1_score(y_val, val_pred, average='weighted'), 4)
        test_acc = round(accuracy_score(y_test, test_pred), 4)
        test_f1 = round(f1_score(y_test, test_pred, average='weighted'), 4)

        res = {"type":cfg["type"],"val_acc":val_acc,"val_f1":val_f1,
               "test_acc":test_acc,"test_f1":test_f1,"oob_score":round(model.oob_score_,4)}

        if cfg["type"] == "binary":
            from sklearn.metrics import recall_score
            res["alert_recall"] = round(recall_score(y_test, test_pred, pos_label=1), 4)
            print(f"   Alert Recall: {res['alert_recall']}")

        results[model_key] = res
        print(f"   Val  -> Acc={val_acc}, F1={val_f1}")
        print(f"   Test -> Acc={test_acc}, F1={test_f1}")
        print(f"   OOB  -> {model.oob_score_:.4f}")

        # Confusion matrix
        labels = cfg.get("labels", [str(i) for i in sorted(y_test.unique())])
        cm = confusion_matrix(y_test, test_pred)
        fig, ax = plt.subplots(1, 1, figsize=(7, 6))
        sns.heatmap(cm, annot=True, fmt='d', cmap='Blues', xticklabels=labels, yticklabels=labels, ax=ax)
        ax.set_xlabel("Predicted"); ax.set_ylabel("Actual")
        ax.set_title(f"{cfg['name']} - Confusion Matrix (Acc={test_acc})")
        plt.tight_layout(); plt.savefig(f"plots/{model_key}_cm.png", dpi=150); plt.close()

        # Classification report
        report = classification_report(y_test, test_pred, target_names=labels)
        with open(f"reports/{model_key}_report.txt", "w") as f:
            f.write(f"{cfg['name']} Classification Report\n{'='*50}\n{report}")

    # Save model
    joblib.dump(model, f"models/{model_key}_model.pkl")
    print(f"   [OK] Saved models/{model_key}_model.pkl")

    # Feature importance (top 10)
    feat_imp = pd.Series(model.feature_importances_, index=INPUT_FEATURES).sort_values(ascending=False)
    fig, ax = plt.subplots(1, 1, figsize=(10, 5))
    feat_imp.head(10).plot(kind='barh', ax=ax, color='#6366f1')
    ax.set_title(f"{cfg['name']} - Top 10 Features")
    ax.invert_yaxis()
    plt.tight_layout(); plt.savefig(f"plots/{model_key}_features.png", dpi=150); plt.close()

# ============ SAVE METADATA ============
print("\n[*] Saving model metadata...")

ENCODINGS = {
    "injury_type":{"acl_tear":0,"pcl_tear":1,"mcl_tear":2,"lcl_tear":3,"meniscus_tear":4,
                   "knee_replacement":5,"patellar_tendon":6,"knee_fracture":7,"osteoarthritis":8,"knee_dislocation":9},
    "surgery_type":{"acl_reconstruction":0,"pcl_reconstruction":1,"ligament_repair":2,"meniscectomy":3,
                    "meniscus_repair":4,"total_knee_replacement":5,"partial_knee_replacement":6,
                    "tendon_repair":7,"fracture_fixation":8,"arthroscopy":9,"conservative_treatment":10,"osteotomy":11},
    "gender":{"male":0,"female":1,"other":2},
    "severity":{"mild":0,"moderate":1,"severe":2},
    "comorbidity":{"none":0,"diabetes":1,"hypertension":2,"obesity":3,"osteoporosis":4},
    "activity":{"sedentary":0,"moderate":1,"active":2,"athlete":3},
    "graft_type":{"autograft":0,"allograft":1,"synthetic":2,"none":3},
    "affected_side":{"left":0,"right":1,"bilateral":2},
    "gait_status":{"non_weight_bearing":0,"partial":1,"full_assisted":2,"independent":3},
    "brace_status":{"locked_extension":0,"hinged_limited":1,"hinged_full":2,"none":3},
    "risk_level":{"low":0,"medium":1,"high":2},
    "recovery_rate":{"slow":0,"normal":1,"fast":2},
    "rehab_phase":{"protection":0,"mobility":1,"strengthening":2,"functional":3},
}

metadata = {
    "model_version": "1.0.0",
    "project": "KneeRevive AI",
    "training_date": pd.Timestamp.now().strftime("%Y-%m-%d %H:%M:%S"),
    "total_samples": len(train_df) + len(val_df) + len(test_df),
    "train_samples": len(train_df),
    "val_samples": len(val_df),
    "test_samples": len(test_df),
    "input_features": INPUT_FEATURES,
    "num_features": len(INPUT_FEATURES),
    "num_models": 6,
    "models": {k: f"models/{k}_model.pkl" for k in TARGETS},
    "encodings": ENCODINGS,
    "results": results,
}

with open("models/model_metadata.json", "w") as f:
    json.dump(metadata, f, indent=2)
print("[OK] models/model_metadata.json saved")

# ============ FINAL SUMMARY ============
print(f"\n{'='*60}")
print("  TRAINING COMPLETE - ALL 6 MODELS")
print(f"{'='*60}")
print(f"  {'Model':<20} {'Type':<18} {'Key Metric':<20}")
print(f"  {'-'*58}")
for k, r in results.items():
    if r["type"] == "regression":
        print(f"  {k:<20} {'regression':<18} R2={r['test_r2']}, MAE={r['test_mae']}")
    else:
        extra = f", Recall={r['alert_recall']}" if 'alert_recall' in r else ""
        print(f"  {k:<20} {r['type']:<18} Acc={r['test_acc']}, F1={r['test_f1']}{extra}")
print(f"\n  Models saved to: models/")
print(f"  Plots saved to:  plots/")
print(f"  Reports saved to: reports/")
print(f"{'='*60}")
