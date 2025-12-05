import axios from 'axios';

const NASA_BASE_URL = 'https://api.nasa.gov/DONKI';
const API_KEY = 'DEMO_KEY'; // In prod, use real key or proxy

export interface SolarFlare {
    flrID: string;
    beginTime: string;
    peakTime: string;
    endTime: string;
    classType: string;
    sourceLocation: string;
    note: string;
}

export interface CME {
    activityID: string;
    startTime: string;
    note: string;
    cmeAnalyses: {
        speed: number;
        type: string;
        isGeoeffective: boolean;
    }[];
}

export const nasaApi = {
    getSolarFlares: async (startDate: string, endDate: string): Promise<SolarFlare[]> => {
        try {
            const response = await axios.get<SolarFlare[]>(`${NASA_BASE_URL}/FLR`, {
                params: { startDate, endDate, api_key: API_KEY }
            });
            return response.data;
        } catch (error) {
            console.error("Error fetching flares", error);
            return [];
        }
    },

    getCMEs: async (startDate: string, endDate: string): Promise<CME[]> => {
        try {
            const response = await axios.get<CME[]>(`${NASA_BASE_URL}/CME`, {
                params: { startDate, endDate, api_key: API_KEY }
            });
            return response.data;
        } catch (error) {
            console.error("Error fetching CMEs", error);
            return [];
        }
    }
};
