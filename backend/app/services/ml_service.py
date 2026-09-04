"""
ML Analyzer — IsolationForest-based anomaly detection for predictive maintenance.
Replaces the static threshold logic in ai-analyzer.service.ts.

Features:
- Trains an IsolationForest model from accumulated sensor data
- Real-time anomaly prediction with confidence scores
- Automatic fallback to threshold-based logic if insufficient training data
- Model auto-retrains periodically as more data accumulates
"""

import logging
from typing import Optional

import numpy as np
from sklearn.ensemble import IsolationForest

from app.core.config import settings

logger = logging.getLogger("ml_analyzer")

class MLAnalyzer:
    """
    Machine Learning-based anomaly detector for industrial motor sensors.
    Uses IsolationForest for unsupervised anomaly detection.
    """

    def __init__(self):
        self.model: Optional[IsolationForest] = None
        self.is_trained: bool = False
        self.training_data: list = []
        self.min_samples: int = settings.ML_MIN_SAMPLES
        self.contamination: float = settings.ML_CONTAMINATION

    def _extract_features(self, data: dict) -> list:
        """
        Extract ML features from raw sensor data.
        
        Features used:
        1. temperature — motor bearing/winding temperature
        2. vibration — bearing vibration velocity
        3. current_imbalance — max difference between 3-phase currents (indicator of winding fault)
        4. voltage_imbalance — max difference between 3-phase voltages (indicator of supply fault)
        5. neutral_current — ground current (should be near zero, high = insulation fault)
        """
        currents = [data.get("currentR", 0), data.get("currentS", 0), data.get("currentT", 0)]
        voltages = [data.get("voltageR", 0), data.get("voltageS", 0), data.get("voltageT", 0)]

        return [
            data.get("temperature", 0),
            data.get("vibration", 0),
            max(currents) - min(currents),      # Current imbalance
            max(voltages) - min(voltages),      # Voltage imbalance
            data.get("currentN", 0),            # Neutral current
        ]

    def collect_training_data(self, data: dict):
        """Accumulate sensor data for model training."""
        features = self._extract_features(data)
        self.training_data.append(features)

    def train(self):
        """
        Train the IsolationForest model with accumulated data.
        Requires minimum number of samples to ensure model quality.
        """
        if len(self.training_data) < self.min_samples:
            logger.debug(
                f"Not enough data to train ({len(self.training_data)}/{self.min_samples}). "
                f"Using fallback threshold logic."
            )
            return

        logger.info(f"🧠 Training ML model with {len(self.training_data)} samples...")

        X = np.array(self.training_data)
        model = IsolationForest(
            contamination=self.contamination, # type: ignore
            n_estimators=100,
            random_state=42,
            n_jobs=-1,
        )
        model.fit(X)
        self.model = model
        self.is_trained = True

        logger.info("✅ ML model trained successfully!")

    def predict(self, data: dict) -> dict:
        """
        Analyze sensor data and return risk assessment.
        
        Returns dict with:
        - risk_level: 'LOW', 'WARNING', or 'CRITICAL'
        - message: Human-readable description
        - confidence: ML confidence score (0-1) or None if using fallback
        - method: 'ml' or 'threshold' (indicates which method was used)
        """
        # Collect data for future training
        self.collect_training_data(data)

        # Use ML model if trained, otherwise fall back to threshold logic
        if self.is_trained and self.model is not None:
            return self._predict_ml(data)
        else:
            return self._predict_threshold(data)

    def _predict_ml(self, data: dict) -> dict:
        """ML-based prediction using IsolationForest."""
        assert self.model is not None
        features = np.array([self._extract_features(data)])

        # IsolationForest: predict returns 1 (normal) or -1 (anomaly)
        prediction = self.model.predict(features)[0]

        # Anomaly score: negative = more anomalous, closer to 0 = more normal
        raw_score = self.model.decision_function(features)[0]

        # Convert to 0-1 confidence (0 = definitely normal, 1 = definitely anomaly)
        # decision_function returns negative for anomalies
        confidence = max(0.0, min(1.0, -raw_score / 0.5 + 0.5))

        if prediction == -1:  # Anomaly detected
            if confidence > 0.75:
                return {
                    "risk_level": "CRITICAL",
                    "message": (
                        f"ML Predicts: High-confidence anomaly detected "
                        f"(score: {confidence:.2f}). "
                        f"Possible bearing failure within 24-48 hours. "
                        f"Temp: {data.get('temperature')}°C, "
                        f"Vibration: {data.get('vibration')} mm/s"
                    ),
                    "confidence": round(confidence, 3),
                    "method": "ml",
                }
            else:
                return {
                    "risk_level": "WARNING",
                    "message": (
                        f"ML Predicts: Moderate anomaly detected "
                        f"(score: {confidence:.2f}). "
                        f"Accelerated wear possible. Schedule maintenance."
                    ),
                    "confidence": round(confidence, 3),
                    "method": "ml",
                }
        else:
            return {
                "risk_level": "LOW",
                "message": "Normal operation",
                "confidence": round(confidence, 3),
                "method": "ml",
            }

    def _predict_threshold(self, data: dict) -> dict:
        """
        Fallback threshold-based prediction.
        Same logic as the original NestJS ai-analyzer.service.ts,
        used when ML model doesn't have enough training data yet.
        """
        temp = data.get("temperature", 0)
        vibration = data.get("vibration", 0)

        if temp > 85 and vibration > 8:
            return {
                "risk_level": "CRITICAL",
                "message": (
                    "Threshold Alert: High probability of Bearing Failure "
                    "within 24-48 hours due to combined thermal and vibration stress."
                ),
                "confidence": None,
                "method": "threshold",
            }
        elif temp > 80 or vibration > 6:
            return {
                "risk_level": "WARNING",
                "message": (
                    "Threshold Alert: Accelerated wear detected. "
                    "Schedule maintenance soon."
                ),
                "confidence": None,
                "method": "threshold",
            }
        else:
            return {
                "risk_level": "LOW",
                "message": "Normal operation",
                "confidence": None,
                "method": "threshold",
            }


# Singleton instance
ml_analyzer = MLAnalyzer()
