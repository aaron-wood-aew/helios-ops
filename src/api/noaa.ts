import axios from 'axios';

const BASE_URL = 'https://services.swpc.noaa.gov/json';

// Types
export interface ProtonFlux {
    time_tag: string;
    flux: number;
    energy: string; // e.g. ">=10 MeV"
}

export interface XRayFlux {
    time_tag: string;
    flux: number;
    energy: string; // "0.1-0.8nm" (Long) or "0.05-0.4nm" (Short)
}

export interface KpIndex {
    time_tag: string;
    kp_index: number;
    estimated_kp: number;
}


export interface SolarWindPlasma {
    time_tag: string;
    density: number;
    speed: number;
    temperature: number;
}

export interface SolarWindMag {
    time_tag: string;
    bz_gsm: number;
    bt: number;
}

export const noaaApi = {
    getProtonFlux: async () => {
        const response = await axios.get<ProtonFlux[]>(`${BASE_URL}/goes/primary/integral-protons-1-day.json`);
        return response.data;
    },

    getXRayFlux: async () => {
        const response = await axios.get<XRayFlux[]>(`${BASE_URL}/goes/primary/xrays-1-day.json`);
        return response.data;
    },

    getKpIndex: async () => {
        // Note: Kp data often comes from a different endpoint structure, using the 1-minute or 3-hour observed
        const response = await axios.get<KpIndex[]>(`${BASE_URL}/planetary_k_index_1m.json`);
        return response.data;
    },

    getSolarWindPlasma: async () => {
        // Returns array of arrays: [time, density, speed, temp]
        const response = await axios.get<any[][]>(`https://services.swpc.noaa.gov/products/solar-wind/plasma-5-minute.json`);
        // Skip header row
        return response.data.slice(1).map(row => ({
            time_tag: row[0],
            density: parseFloat(row[1]),
            speed: parseFloat(row[2]),
            temperature: parseFloat(row[3])
        })) as SolarWindPlasma[];
    },

    getSolarWindMag: async () => {
        // Returns array of arrays: [time, bx, by, bz, lon, lat, bt]
        const response = await axios.get<any[][]>(`https://services.swpc.noaa.gov/products/solar-wind/mag-5-minute.json`);
        // Skip header row
        return response.data.slice(1).map(row => ({
            time_tag: row[0],
            bz_gsm: parseFloat(row[3]),
            bt: parseFloat(row[6])
        })) as SolarWindMag[];
    },

    // --- Historical Data (Backend) ---
    getHistoryXRay: async (start: Date, end: Date) => {
        const s = start.toISOString();
        const e = end.toISOString();
        const response = await axios.get<XRayFlux[]>(`http://localhost:8000/history/xray?start=${s}&end=${e}`);
        return response.data;
    },

    getHistoryProton: async (start: Date, end: Date) => {
        const s = start.toISOString();
        const e = end.toISOString();
        const response = await axios.get<ProtonFlux[]>(`http://localhost:8000/history/proton?start=${s}&end=${e}`);
        return response.data;
    },

    getHistoryWind: async (start: Date, end: Date) => {
        const s = start.toISOString();
        const e = end.toISOString();
        const response = await axios.get<any[]>(`http://localhost:8000/history/wind?start=${s}&end=${e}`);
        // Backend returns {time_tag, speed, density, bz...} already formatted
        return response.data;
    },

    getHistoryKp: async (start: Date, end: Date) => {
        const s = start.toISOString();
        const e = end.toISOString();
        const response = await axios.get<KpIndex[]>(`http://localhost:8000/history/kp?start=${s}&end=${e}`);
        return response.data;
    },

    getAlerts: async () => {
        // Returns array of alerts. We usually only want the active ones or last few.
        // The JSON is a flat list of objects.
        const response = await axios.get<any[]>(`https://services.swpc.noaa.gov/products/alerts.json`);
        return response.data;
    }
};
