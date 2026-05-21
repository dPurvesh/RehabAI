import pandas as pd
import numpy as np
import random, os, json, sys
from datetime import datetime, timedelta
from sklearn.model_selection import train_test_split

sys.stdout.reconfigure(encoding="utf-8")
np.random.seed(42)
random.seed(42)

NUM_PATIENTS = 200
DAYS_PER_PATIENT = 90

# ============ ENCODING MAPS ============
INJURY_ENC = {"acl_tear":0,"pcl_tear":1,"mcl_tear":2,"lcl_tear":3,"meniscus_tear":4,
              "knee_replacement":5,"patellar_tendon":6,"knee_fracture":7,"osteoarthritis":8,"knee_dislocation":9}
SURGERY_ENC = {"acl_reconstruction":0,"pcl_reconstruction":1,"ligament_repair":2,"meniscectomy":3,
               "meniscus_repair":4,"total_knee_replacement":5,"partial_knee_replacement":6,
               "tendon_repair":7,"fracture_fixation":8,"arthroscopy":9,"conservative_treatment":10,"osteotomy":11}
GENDER_ENC = {"male":0,"female":1,"other":2}
SEVERITY_ENC = {"mild":0,"moderate":1,"severe":2}
COMORBID_ENC = {"none":0,"diabetes":1,"hypertension":2,"obesity":3,"osteoporosis":4}
ACTIVITY_ENC = {"sedentary":0,"moderate":1,"active":2,"athlete":3}
GRAFT_ENC = {"autograft":0,"allograft":1,"synthetic":2,"none":3}
SIDE_ENC = {"left":0,"right":1,"bilateral":2}
GAIT_ENC = {"non_weight_bearing":0,"partial":1,"full_assisted":2,"independent":3}
BRACE_ENC = {"locked_extension":0,"hinged_limited":1,"hinged_full":2,"none":3}

INJURY_LIST = list(INJURY_ENC.keys())

# ============ INJURY CONFIGS ============
INJURY_CFG = {
    "acl_tear":         {"pain":(6,9),"rom_start":(5,30), "rom_max":140,"fast":180,"normal":270,"slow":365,
                         "surgeries":["acl_reconstruction","arthroscopy"],"grafts":["autograft","allograft"]},
    "pcl_tear":         {"pain":(5,8),"rom_start":(5,30), "rom_max":135,"fast":180,"normal":270,"slow":365,
                         "surgeries":["pcl_reconstruction","conservative_treatment"],"grafts":["autograft","allograft"]},
    "mcl_tear":         {"pain":(4,7),"rom_start":(10,30),"rom_max":140,"fast":42, "normal":84, "slow":120,
                         "surgeries":["ligament_repair","conservative_treatment"],"grafts":["none"]},
    "lcl_tear":         {"pain":(4,7),"rom_start":(10,30),"rom_max":135,"fast":56, "normal":90, "slow":150,
                         "surgeries":["ligament_repair","conservative_treatment"],"grafts":["none"]},
    "meniscus_tear":    {"pain":(4,7),"rom_start":(20,60),"rom_max":140,"fast":42, "normal":90, "slow":150,
                         "surgeries":["meniscectomy","meniscus_repair","arthroscopy"],"grafts":["none"]},
    "knee_replacement": {"pain":(6,9),"rom_start":(10,40),"rom_max":120,"fast":84, "normal":168,"slow":270,
                         "surgeries":["total_knee_replacement","partial_knee_replacement"],"grafts":["none"]},
    "patellar_tendon":  {"pain":(7,9),"rom_start":(0,5),  "rom_max":130,"fast":120,"normal":180,"slow":270,
                         "surgeries":["tendon_repair"],"grafts":["autograft","synthetic"]},
    "knee_fracture":    {"pain":(7,9),"rom_start":(0,20), "rom_max":130,"fast":90, "normal":150,"slow":240,
                         "surgeries":["fracture_fixation","arthroscopy"],"grafts":["none"]},
    "osteoarthritis":   {"pain":(3,6),"rom_start":(20,50),"rom_max":120,"fast":60, "normal":120,"slow":180,
                         "surgeries":["osteotomy","partial_knee_replacement","conservative_treatment"],"grafts":["none"]},
    "knee_dislocation": {"pain":(7,10),"rom_start":(0,5), "rom_max":125,"fast":120,"normal":210,"slow":330,
                         "surgeries":["ligament_repair","acl_reconstruction","pcl_reconstruction"],"grafts":["autograft","allograft","none"]},
}

def clamp(v, lo, hi): return round(max(lo, min(hi, v)), 2)

# ============ GENERATE PATIENT PROFILES ============
print("[*] Generating 200 patient profiles...")
profiles = []
for i in range(NUM_PATIENTS):
    cat = "fast" if i < 80 else ("normal" if i < 160 else "slow")
    injury = INJURY_LIST[i % 10]
    cfg = INJURY_CFG[injury]

    age = random.randint(*({"fast":(18,35),"normal":(28,55),"slow":(45,72)}[cat]))
    gender = random.choice(["male","female","other"])
    height = random.uniform(*({"male":(165,190),"female":(150,175),"other":(155,180)}[gender]))
    weight = random.uniform(*({"male":(60,100),"female":(45,85),"other":(50,90)}[gender]))
    bmi = round(weight/((height/100)**2), 1)
    severity = random.choice({"fast":["mild","mild","moderate"],"normal":["mild","moderate","moderate","severe"],"slow":["moderate","severe","severe"]}[cat])
    comorbidity = random.choice({"fast":["none"]*4+["hypertension"],"normal":["none"]*3+["hypertension","diabetes"],"slow":["none","diabetes","hypertension","obesity","osteoporosis"]}[cat])
    activity = random.choice({"fast":["active","athlete","moderate"],"normal":["sedentary","moderate","moderate","active"],"slow":["sedentary","sedentary","moderate"]}[cat])
    surgery = random.choice(cfg["surgeries"])
    graft = random.choice(cfg["grafts"])
    side = random.choice(["left","right"]) if injury != "knee_replacement" else random.choice(["left","right","bilateral"])
    expected_days = cfg[cat]
    initial_pain = random.uniform(*cfg["pain"])
    rom_start = random.uniform(*cfg["rom_start"])

    profiles.append({"id":f"P{i+1:03d}","cat":cat,"age":age,"gender":gender,"weight_kg":round(weight,1),
        "height_cm":round(height,1),"bmi":bmi,"injury_type":injury,"surgery_type":surgery,"severity":severity,
        "comorbidity":comorbidity,"activity":activity,"graft_type":graft,"affected_side":side,
        "expected_days":expected_days,"initial_pain":initial_pain,"rom_start":rom_start,"rom_max":cfg["rom_max"]})

print(f"[OK] 200 profiles (80 fast, 80 normal, 40 slow)")

# ============ DAILY DATA GENERATION ============
print("[*] Generating daily records (18,000 rows)...")

DECAY = {"fast":0.028,"normal":0.016,"slow":0.009}
ROM_GROWTH = {"fast":0.022,"normal":0.013,"slow":0.007}
COMPLIANCE = {"fast":(75,95),"normal":(50,80),"slow":(25,60)}
NOISE = {"fast":0.5,"normal":1.0,"slow":1.5}

all_rows = []
for p in profiles:
    cat, inj = p["cat"], p["injury_type"]
    decay, growth = DECAY[cat], ROM_GROWTH[cat]
    comp_base = random.uniform(*COMPLIANCE[cat])
    noise_amp = NOISE[cat]
    init_pain, rom_s, rom_m = p["initial_pain"], p["rom_start"], p["rom_max"]
    exp_days = p["expected_days"]

    # Relapse config
    has_relapse = random.random() < {"fast":0.10,"normal":0.18,"slow":0.30}[cat]
    relapse_start = random.randint(15, 60) if has_relapse else -1
    relapse_dur = random.randint(5, 14) if has_relapse else 0
    relapse_end = relapse_start + relapse_dur

    # Running values
    total_physio = 0
    last_physio_day = 0
    prev_pains, prev_exercises, prev_sleeps = [], [], []

    for day in range(1, DAYS_PER_PATIENT + 1):
        in_relapse = 1 if has_relapse and relapse_start <= day <= relapse_end else 0
        relapse_boost = random.uniform(2, 4) if in_relapse else 0

        # --- PAIN ---
        pain = init_pain * np.exp(-decay * day) + random.uniform(-noise_amp, noise_amp) + relapse_boost
        if random.random() < 0.08: pain += random.uniform(1, 2.5)  # bad day
        pain = clamp(pain, 0, 10)

        # --- SWELLING ---
        swell_base = max(1, init_pain * 0.5 * np.exp(-decay * 1.3 * day))
        swelling = clamp(swell_base + random.uniform(-0.5, 0.5) + (1.5 if in_relapse else 0), 1, 5)
        swelling = int(round(swelling))

        # --- STIFFNESS ---
        stiff_init = {"knee_replacement":4.5,"patellar_tendon":4.5,"knee_dislocation":4.0,"knee_fracture":4.0}.get(inj, 3.5)
        stiffness = clamp(stiff_init * np.exp(-decay * 0.9 * day) + random.uniform(-0.3, 0.5) + (1 if in_relapse else 0), 1, 5)
        stiffness = int(round(stiffness))

        # --- EXERCISE ---
        day_comp = comp_base + (day / DAYS_PER_PATIENT) * 15 + random.uniform(-10, 10)
        if in_relapse: day_comp -= 30
        exercises_pct = clamp(day_comp, 0, 100)

        ex_dur_base = 10 + (day / DAYS_PER_PATIENT) * 35 + random.uniform(-5, 5)
        if in_relapse: ex_dur_base *= 0.4
        exercise_dur = int(clamp(ex_dur_base, 0, 90))

        phase_num = 0 if day <= 42 else (1 if day <= 70 else (2 if day <= 85 else 3))
        ex_diff = clamp(phase_num + 1 + random.uniform(-0.3, 0.5), 1, 5)
        ex_diff = int(round(ex_diff))

        # --- STEPS ---
        gait_prog = min(3, int(day / 25))
        steps_base = [200, 800, 2500, 5000][gait_prog]
        steps = int(clamp(steps_base + random.uniform(-200, 500) + day * 15, 0, 12000))
        if in_relapse: steps = int(steps * 0.3)

        # --- SLEEP ---
        sleep_h = clamp(5.5 + (day / DAYS_PER_PATIENT) * 2.5 + random.uniform(-0.8, 0.8) - (pain * 0.15), 3, 12)
        sleep_q = int(clamp(round(2 + (day / DAYS_PER_PATIENT) * 2.5 - pain * 0.15 + random.uniform(-0.5, 0.5)), 1, 5))
        woken = int(clamp(round(3 - (day / DAYS_PER_PATIENT) * 2.5 + pain * 0.2 + random.uniform(-0.5, 0.5)), 0, 8))
        rested = int(clamp(round(2 + (day / DAYS_PER_PATIENT) * 2.5 - pain * 0.12 + random.uniform(-0.5, 0.5)), 1, 5))

        # --- FATIGUE & MOOD ---
        fatigue = int(clamp(round(pain * 0.6 + (5 - sleep_q) * 0.8 + random.uniform(-1, 1)), 1, 10))
        mood = int(clamp(round(5 - pain * 0.3 + (day / DAYS_PER_PATIENT) * 1.5 + random.uniform(-0.5, 0.5)), 1, 5))

        # --- MEDICATION & PHYSIO ---
        med = 1 if (pain > 4 or day < 21 or random.random() < 0.2) else 0
        physio_today = 1 if (day % 7 in [1, 4] and random.random() < 0.8) or random.random() < 0.1 else 0
        if physio_today: total_physio += 1; last_physio_day = day
        days_since_physio = day - last_physio_day if last_physio_day > 0 else day
        independence = int(clamp(round(1 + (day / DAYS_PER_PATIENT) * 3.5 - (2 if in_relapse else 0) + random.uniform(-0.3, 0.3)), 1, 5))
        ice = 1 if (pain > 3 or swelling > 2 or day < 30) and random.random() < 0.7 else 0

        # --- CLINICAL (update weekly, carry forward) ---
        if day == 1 or day % 7 == 0:
            rom_flex = clamp(rom_s + (rom_m - rom_s) * (1 - np.exp(-growth * day)) + random.uniform(-3, 3) - (10 if in_relapse else 0), 0, 160)
            rom_ext_def = clamp(max(0, random.uniform(5, 15) * np.exp(-0.03 * day) + random.uniform(-1, 1)), 0, 20)
            strength = int(clamp(round(1.5 + (day / DAYS_PER_PATIENT) * 3 + random.uniform(-0.3, 0.3)), 1, 5))
            balance = int(clamp(round(1.5 + (day / DAYS_PER_PATIENT) * 3 + random.uniform(-0.3, 0.3)), 1, 5))
            quad_act = int(clamp(round(1 + (day / DAYS_PER_PATIENT) * 3.5 + random.uniform(-0.3, 0.3)), 1, 5))
            gait_enc = min(3, int(day / 22))
            func_mob = clamp(20 + (day / DAYS_PER_PATIENT) * 65 + random.uniform(-5, 5) - (15 if in_relapse else 0), 0, 100)
            brace_enc = min(3, int(day / 25))

        # --- TRENDS ---
        prev_pains.append(pain); prev_exercises.append(exercises_pct); prev_sleeps.append(sleep_h)
        if len(prev_pains) >= 14:
            pain_trend = round(np.mean(prev_pains[-7:]) - np.mean(prev_pains[-14:-7]), 3)
            ex_trend = round(np.mean(prev_exercises[-7:]) - np.mean(prev_exercises[-14:-7]), 3)
            sleep_trend = round(np.mean(prev_sleeps[-7:]) - np.mean(prev_sleeps[-14:-7]), 3)
        else:
            pain_trend, ex_trend, sleep_trend = 0, 0, 0

        # ========== TARGET VARIABLES ==========
        rom_pct = min(100, (rom_flex / rom_m) * 100)
        recovery_score = clamp(
            rom_pct * 0.25 + ((10 - pain) / 10 * 100) * 0.20 + exercises_pct * 0.15 +
            (strength / 5 * 100) * 0.15 + func_mob * 0.10 + (sleep_q / 5 * 100) * 0.10 +
            (mood / 5 * 100) * 0.05 + random.uniform(-3, 3), 0, 100)

        risk_score = (pain * 2 + swelling * 1.5 + stiffness + (10 - exercises_pct / 10) +
                      (1 if p["age"] > 55 else 0) * 2 + (0 if p["comorbidity"] == "none" else 2) +
                      in_relapse * 5 - total_physio * 0.2)
        risk_enc = 0 if risk_score < 14 else (1 if risk_score < 22 else 2)

        progress_ratio = recovery_score / max(1, (day / exp_days) * 100)
        rate_enc = 2 if progress_ratio > 1.15 else (0 if progress_ratio < 0.75 else 1)

        days_rem = int(clamp(exp_days * (1 - recovery_score / 100) + random.uniform(-5, 5), 1, 400))

        alert = 0
        if len(prev_pains) >= 3 and all(x > 7 for x in prev_pains[-3:]): alert = 1
        if in_relapse and risk_enc == 2: alert = 1
        if len(prev_pains) >= 8 and np.mean(prev_pains[-3:]) > np.mean(prev_pains[-8:-3]) + 2: alert = 1

        phase_enc = 0 if (day <= 42 and rom_flex < 90) else (1 if (day <= 70 or strength < 3) else (2 if (day <= 85 or func_mob < 70) else 3))

        all_rows.append({
            "patient_id":p["id"],"age":p["age"],"gender_enc":GENDER_ENC[p["gender"]],
            "weight_kg":p["weight_kg"],"height_cm":p["height_cm"],"bmi":p["bmi"],
            "injury_type_enc":INJURY_ENC[p["injury_type"]],"surgery_type_enc":SURGERY_ENC[p["surgery_type"]],
            "severity_enc":SEVERITY_ENC[p["severity"]],"comorbidity_enc":COMORBID_ENC[p["comorbidity"]],
            "activity_enc":ACTIVITY_ENC[p["activity"]],"graft_type_enc":GRAFT_ENC[p["graft_type"]],
            "affected_side_enc":SIDE_ENC[p["affected_side"]],
            "day_number":day,"pain_level":round(pain,1),"swelling_level":swelling,"stiffness_level":stiffness,
            "exercises_completed_percent":round(exercises_pct,1),"exercise_duration_mins":exercise_dur,
            "exercise_difficulty":ex_diff,"steps_walked":steps,
            "sleep_hours":round(sleep_h,1),"sleep_quality":sleep_q,"times_woken_up":woken,"rested_feeling":rested,
            "fatigue_level":fatigue,"mood_score":mood,"medication_taken":med,
            "physio_session_today":physio_today,"independence_level":independence,"ice_applied_today":ice,
            "range_of_motion_flexion":round(rom_flex,1),"range_of_motion_extension":round(rom_ext_def,1),
            "muscle_strength_score":strength,"balance_score":balance,
            "gait_status_enc":gait_enc,"functional_mobility_score":round(func_mob,1),
            "quad_activation_score":quad_act,"brace_status_enc":brace_enc,
            "pain_trend_7day":pain_trend,"exercise_trend_7day":ex_trend,"sleep_trend_7day":sleep_trend,
            "in_relapse":in_relapse,
            # Targets
            "recovery_score":round(recovery_score,2),"risk_level_enc":risk_enc,"recovery_rate_enc":rate_enc,
            "days_remaining":days_rem,"physio_alert":alert,"rehab_phase_enc":phase_enc,
            # String labels for reference
            "injury_type":p["injury_type"],"gender":p["gender"],"severity":p["severity"],
            "surgery_type":p["surgery_type"],"comorbidity":p["comorbidity"],"activity":p["activity"],
            "graft_type":p["graft_type"],"affected_side":p["affected_side"],
        })

    if (profiles.index(p) + 1) % 50 == 0:
        print(f"   [{profiles.index(p)+1}/200] patients done...")

df = pd.DataFrame(all_rows)
print(f"[OK] {len(df)} rows generated")

# ============ VALIDATION ============
print("\n[*] Validating data quality...")
assert df.isnull().sum().sum() == 0, "Found null values!"
assert len(df) == NUM_PATIENTS * DAYS_PER_PATIENT
assert df["pain_level"].between(0, 10).all()
assert df["recovery_score"].between(0, 100).all()
assert df["range_of_motion_flexion"].between(0, 160).all()

risk_dist = df["risk_level_enc"].value_counts(normalize=True).sort_index()
rate_dist = df["recovery_rate_enc"].value_counts(normalize=True).sort_index()
phase_dist = df["rehab_phase_enc"].value_counts(normalize=True).sort_index()
print(f"   Risk distribution:  LOW={risk_dist.get(0,0):.1%} MED={risk_dist.get(1,0):.1%} HIGH={risk_dist.get(2,0):.1%}")
print(f"   Rate distribution:  SLOW={rate_dist.get(0,0):.1%} NORMAL={rate_dist.get(1,0):.1%} FAST={rate_dist.get(2,0):.1%}")
print(f"   Phase distribution: PROTECT={phase_dist.get(0,0):.1%} MOBILITY={phase_dist.get(1,0):.1%} STRENGTH={phase_dist.get(2,0):.1%} FUNC={phase_dist.get(3,0):.1%}")

corr_pain_score = df["pain_level"].corr(df["recovery_score"])
corr_day_rom = df["day_number"].corr(df["range_of_motion_flexion"])
corr_ex_score = df["exercises_completed_percent"].corr(df["recovery_score"])
print(f"   Correlations: pain↔score={corr_pain_score:.3f}, day↔ROM={corr_day_rom:.3f}, exercise↔score={corr_ex_score:.3f}")
print("[OK] All validations passed")

# ============ FEATURE COLUMNS ============
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
TARGET_COLS = ["recovery_score","risk_level_enc","recovery_rate_enc","days_remaining","physio_alert","rehab_phase_enc"]

# ============ SPLIT & SAVE ============
print("\n[*] Splitting dataset...")
os.makedirs("data", exist_ok=True)

keep_cols = INPUT_FEATURES + TARGET_COLS + ["patient_id","injury_type","gender","severity","surgery_type","comorbidity","activity","graft_type","affected_side"]

train_df, temp_df = train_test_split(df[keep_cols], test_size=0.30, random_state=42,
                                      stratify=df["risk_level_enc"])
val_df, test_df = train_test_split(temp_df, test_size=0.50, random_state=42,
                                    stratify=temp_df["risk_level_enc"])

train_df.to_csv("data/train.csv", index=False)
val_df.to_csv("data/validation.csv", index=False)
test_df.to_csv("data/test.csv", index=False)
df[keep_cols].to_csv("data/full_dataset.csv", index=False)

print(f"   Train:      {len(train_df)} rows")
print(f"   Validation: {len(val_df)} rows")
print(f"   Test:       {len(test_df)} rows")
print(f"   Full:       {len(df)} rows")

# ============ PER-INJURY SUMMARY ============
print("\n" + "="*60)
print("PER-INJURY SUMMARY")
print("="*60)
for inj in INJURY_LIST:
    sub = df[df["injury_type"] == inj]
    print(f"\n  {inj.upper().replace('_',' ')} ({len(sub)} rows)")
    print(f"    Pain:     {sub['pain_level'].mean():.1f} avg, {sub['pain_level'].min():.1f}-{sub['pain_level'].max():.1f}")
    print(f"    ROM:      {sub['range_of_motion_flexion'].mean():.1f} avg, {sub['range_of_motion_flexion'].max():.1f} max")
    print(f"    Score:    {sub['recovery_score'].mean():.1f} avg")
    print(f"    Risk:     L={sum(sub['risk_level_enc']==0)} M={sum(sub['risk_level_enc']==1)} H={sum(sub['risk_level_enc']==2)}")

print(f"\n{'='*60}")
print(f"[DONE] KneeRevive dataset generated successfully!")
print(f"  {len(df)} total rows | {len(INPUT_FEATURES)} features | {len(TARGET_COLS)} targets")
print(f"  Files saved in data/")
print(f"{'='*60}")
