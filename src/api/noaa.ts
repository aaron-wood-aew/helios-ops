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

export interface ElectronFlux {
    time_tag: string;
    flux: number;
    energy: string;
    satellite: number;
}

export interface DstIndex {
    time_tag: string;
    dst: number;
}

const BACKEND_API = import.meta.env.PROD ? '' : 'http://localhost:8000';

export const noaaApi = {
    getProtonFlux: async () => {
        const response = await axios.get<ProtonFlux[]>(`${BASE_URL}/goes/primary/integral-protons-1-day.json`);
        return response.data;
    },

    getElectronFlux: async () => {
        const response = await axios.get<ElectronFlux[]>(`${BASE_URL}/goes/primary/integral-electrons-1-day.json`);
        return response.data;
    },

    getXRayFlux: async () => {
        const response = await axios.get<XRayFlux[]>(`${BASE_URL}/goes/primary/xrays-1-day.json`);
        return response.data;
    },

    getDstIndex: async () => {
        // Source: https://services.swpc.noaa.gov/products/kyoto-dst.json
        // Format: [["time_tag","dst"],["2025-11-29 02:00:00","-16"],...]
        const response = await axios.get<any[]>('https://services.swpc.noaa.gov/products/kyoto-dst.json');
        const data = response.data;
        // Skip header row
        const rows = data.slice(1);

        return rows.map((row: any[]) => ({
            time_tag: row[0],
            dst: parseInt(row[1], 10)
        })) as DstIndex[];
    },

    getKpIndex: async () => {
        // Note: Using the observed Kp archive which covers past ~7 days
        const response = await axios.get<any[]>(`https://services.swpc.noaa.gov/products/noaa-planetary-k-index.json`);
        // The array also includes forecasts mixed in or header?
        // Actually this file is often [time, kp, a_index, ...] without headers.
        // Let's verify format. Actually the docs say it's [time_tag, kp, a_running, station_count].
        // We need to map it to our KpIndex type.
        // Example: ["2025-12-05 21:00:00", "2", "6", "8"]

        // Wait, standard product is usually array of arrays with header.
        // Let's safe parse.
        const data = response.data;
        const rows = Array.isArray(data[0]) ? data.slice(1) : data; // heuristic to skip header if present

        return rows.map((row: any) => ({
            time_tag: row[0],
            kp_index: parseFloat(row[1]),
            estimated_kp: parseFloat(row[1]) // fallback
        })) as KpIndex[];
    },

    getSolarWindPlasma: async () => {
        // Returns array of arrays: [time, density, speed, temp]
        // Using 7-day file to ensure coverage for 24h view and avoid empty 5-min file
        const response = await axios.get<any[][]>(`https://services.swpc.noaa.gov/products/solar-wind/plasma-7-day.json`);
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
        // Using 7-day file
        const response = await axios.get<any[][]>(`https://services.swpc.noaa.gov/products/solar-wind/mag-7-day.json`);
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
        const response = await axios.get<XRayFlux[]>(`${BACKEND_API}/history/xray?start=${s}&end=${e}`);
        return response.data;
    },

    getHistoryProton: async (start: Date, end: Date) => {
        const s = start.toISOString();
        const e = end.toISOString();
        const response = await axios.get<ProtonFlux[]>(`${BACKEND_API}/history/proton?start=${s}&end=${e}`);
        return response.data;
    },

    getHistoryWind: async (start: Date, end: Date) => {
        const s = start.toISOString();
        const e = end.toISOString();
        const response = await axios.get<any[]>(`${BACKEND_API}/history/wind?start=${s}&end=${e}`);
        // Backend returns {time_tag, speed, density, bz...} already formatted
        return response.data;
    },

    getHistoryKp: async (start: Date, end: Date) => {
        const s = start.toISOString();
        const e = end.toISOString();
        const response = await axios.get<KpIndex[]>(`${BACKEND_API}/history/kp?start=${s}&end=${e}`);
        return response.data;
    },

    // ...

    getHistoryElectron: async (start: Date, end: Date) => {
        const s = start.toISOString();
        const e = end.toISOString();
        const response = await axios.get<ElectronFlux[]>(`${BACKEND_API}/history/electron?start=${s}&end=${e}`);
        return response.data;
    },

    getHistoryDst: async (start: Date, end: Date) => {
        const url = `${BACKEND_API}/history/dst?start=${start.toISOString()}&end=${end.toISOString()}`;
        const response = await axios.get<DstIndex[]>(url);
        return response.data;
    },

    getHistoryImages: async (product: 'suvi' | 'lasco' | 'aurora', start: Date, end: Date, channel?: string) => {
        let url = `${BACKEND_API}/history/images?product=${product}&start=${start.toISOString()}&end=${end.toISOString()}`;
        if (channel) url += `&channel=${channel}`;
        const response = await axios.get<{ time: string, url: string }[]>(url);
        return response.data;
    },

    getArchiveStatus: async () => {
        const response = await axios.get<Record<string, { count: number, start: string | null, end: string | null }>>(`${BACKEND_API}/api/status`);
        return response.data;
    },

    getAlerts: async () => {
        // Returns array of alerts. We usually only want the active ones or last few.
        // The JSON is a flat list of objects.
        const response = await axios.get<any[]>(`https://services.swpc.noaa.gov/products/alerts.json`);
        return response.data;
    },

    getSUVIImages: async (channel: string) => {
        const response = await axios.get<{ images: string[] }>(`${BACKEND_API}/api/suvi/${channel}`);
        return response.data.images;
    },

    getLASCOImages: async (type: 'c2' | 'c3') => {
        // Fetch from NOAA JSON product
        const response = await axios.get<{ url: string }[]>(`https://services.swpc.noaa.gov/products/animations/lasco-${type}.json`);
        // URLs are relative to domain root, need to prepend
        return response.data.map(item => `https://services.swpc.noaa.gov${item.url}`);
    },

    getAuroraImage: (hemisphere: 'north' | 'south') => {
        return `https://services.swpc.noaa.gov/images/aurora-forecast-${hemisphere}ern-hemisphere.jpg?t=${Date.now()}`;
    },

    getAuroraAnimation: async (hemisphere: 'north' | 'south') => {
        const response = await axios.get<{ url: string; time_tag: string }[]>(
            `https://services.swpc.noaa.gov/products/animations/ovation_${hemisphere}_24h.json`
        );
        return response.data.map(item => ({
            url: `https://services.swpc.noaa.gov${item.url}`,
            time_tag: item.time_tag
        }));
    },
};
