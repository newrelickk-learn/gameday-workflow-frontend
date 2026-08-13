import type { City, EstimateTravelCostRequest, EstimateTravelCostResponse } from '../types';

const STUB_CITIES: City[] = [
  { id: 1, nameJa: '東京', isUnstable: false },
  { id: 2, nameJa: '大阪', isUnstable: false },
  { id: 3, nameJa: '名古屋', isUnstable: false },
  { id: 4, nameJa: '福岡', isUnstable: false },
  { id: 5, nameJa: '札幌', isUnstable: false },
  { id: 6, nameJa: '仙台', isUnstable: false },
  { id: 7, nameJa: '広島', isUnstable: false },
  { id: 8, nameJa: '金沢', isUnstable: false },
  { id: 9, nameJa: '那覇', isUnstable: false },
  { id: 10, nameJa: '静岡', isUnstable: false },
  { id: 11, nameJa: '北九州', isUnstable: true },
];

export const stubTravelService = {
  async getCities(): Promise<City[]> {
    return STUB_CITIES;
  },

  async estimateTravelCost(data: EstimateTravelCostRequest): Promise<EstimateTravelCostResponse> {
    const distance = Math.abs(data.departureCityId - data.arrivalCityId);
    const amount = 8000 + distance * 3500;
    return { amount, currency: 'JPY' };
  },
};
