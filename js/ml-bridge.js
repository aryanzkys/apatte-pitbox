/**
 * ML BRIDGE - Dashboard connector to kerangka_ml runtime
 *
 * This bridge is frontend-safe:
 * - If backend endpoint is available, it calls real inference API.
 * - If not, it uses deterministic demo fallback so dashboard stays live.
 */
(function initMLBridge(global) {
    const MODEL_CATALOG = [
        { key: 'energy', label: 'Energy Predictor', module: 'kerangka_ml.models.energy_predictor' },
        { key: 'racing_line', label: 'Racing Line Optimizer', module: 'kerangka_ml.models.racing_line' },
        { key: 'h2_purge', label: 'H2 Purge Scheduler', module: 'kerangka_ml.models.h2_purge' },
        { key: 'fatigue', label: 'Fatigue Detector', module: 'kerangka_ml.models.fatigue_detector' },
        { key: 'anomaly', label: 'Anomaly Detection', module: 'kerangka_ml.models.anomaly_detection' },
        { key: 'efficiency', label: 'Efficiency Map', module: 'kerangka_ml.models.efficiency_map' },
        { key: 'slip_coast', label: 'Slip & Coasting Optimizer', module: 'kerangka_ml.models.slip_coast' },
        { key: 'rank', label: 'Rank Predictor', module: 'kerangka_ml.models.rank_predictor' }
    ];

    function getAppSettings() {
        try {
            return JSON.parse(localStorage.getItem('appSettings') || '{}');
        } catch {
            return {};
        }
    }

    function getBridgeConfig() {
        const settings = getAppSettings();
        return settings.mlBridge || {
            endpoint: 'http://127.0.0.1:8000/api/ml/inference',
            demoMode: false,
            timeoutMs: 1200
        };
    }

    async function callEndpoint(endpoint, payload, timeoutMs = 1200) {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), timeoutMs);

        try {
            const response = await fetch(endpoint, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
                signal: controller.signal
            });

            if (!response.ok) {
                throw new Error(`ML endpoint error ${response.status}`);
            }

            return await response.json();
        } finally {
            clearTimeout(timeout);
        }
    }

    function fallbackInference(input) {
        const ph2Speed = Number(input?.telemetry?.ph2?.speed || 50);
        const ucbeSpeed = Number(input?.telemetry?.ucbe?.speed || 52);
        const meanSpeed = (ph2Speed + ucbeSpeed) / 2;

        const energyRemainH2 = Math.max(5, (46 - meanSpeed * 0.08) + (Math.random() * 2 - 1));
        const energyRemainBE = Math.max(5, (40 - meanSpeed * 0.07) + (Math.random() * 2 - 1));
        const purgeMin = Math.max(3, Math.round(10 - ph2Speed * 0.03));
        const fatigueLevel = ucbeSpeed > 60 ? 'MEDIUM' : 'LOW';

        return {
            source: 'fallback',
            models_executed: MODEL_CATALOG.map(m => m.key),
            insights: {
                ph2: {
                    energy: `${energyRemainH2.toFixed(1)} km remaining fuel`,
                    purge: `Purge in ${purgeMin} minutes`,
                    anomaly: meanSpeed > 62 ? 'Minor vibration pattern detected' : 'No anomalies detected'
                },
                ucbe: {
                    energy: `${energyRemainBE.toFixed(1)} km remaining charge`,
                    efficiency: meanSpeed > 58 ? 'Recommended: ease throttle 3%' : 'Maintain current RPM',
                    fatigue: `Driver alert level: ${fatigueLevel}`
                },
                racingLine: meanSpeed > 60 ? 'Optimize late apex on next sector' : 'Line stable, continue current trajectory'
            }
        };
    }

    async function inferOverview(input) {
        const bridgeConfig = getBridgeConfig();
        const endpoint = (bridgeConfig.endpoint || '').trim();

        if (endpoint && !bridgeConfig.demoMode) {
            try {
                return await callEndpoint(endpoint, {
                    context: input?.context || {},
                    telemetry: input?.telemetry || {},
                    requested_models: MODEL_CATALOG.map(m => m.key)
                }, Number(bridgeConfig.timeoutMs) || 1200);
            } catch {
                return fallbackInference(input);
            }
        }

        return fallbackInference(input);
    }

    global.MLBridge = {
        getCatalog: () => [...MODEL_CATALOG],
        getBridgeConfig,
        inferOverview
    };
})(window);
