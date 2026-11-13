import type { Category } from './types'

export interface ShopInfo {
  id: string
  name: string
  url: string
}

// Competitor assignments as approved by the client (13 Nov 2026).
// Must stay in step with CATEGORY_SHOPS in n8n/extractors.js.
export const COMPETITORS: Record<Category, ShopInfo[]> = {
  iphone: [
    { id: 'francium', name: 'Francium', url: 'https://www.francium.lk/' },
    { id: 'iplanet', name: 'iPlanet', url: 'https://iplanet.one/' },
    { id: 'ispot', name: 'iSpot', url: 'https://ispot.lk/' },
    { id: 'presentsolution', name: 'Present Solution', url: 'https://presentsolution.lk/' },
    { id: 'greenware', name: 'Greenware', url: 'https://www.greenware.lk/' },
    { id: 'applemall', name: 'Apple Mall', url: 'https://www.applemall.lk/' },
    { id: 'onei', name: 'ONEi', url: 'https://onei.lk/' },
  ],
  samsung: [
    { id: 'idealz', name: 'iDealz', url: 'https://idealz.lk/' },
    { id: 'smartmobile', name: 'Smart Mobile', url: 'https://smartmobile.lk/' },
    { id: 'presentsolution', name: 'Present Solution', url: 'https://presentsolution.lk/' },
    { id: 'simplytek', name: 'Simplytek', url: 'https://www.simplytek.lk/' },
    { id: 'lifemobile', name: 'Life Mobile', url: 'https://lifemobile.lk/' },
    { id: 'smartzone', name: 'Smartzone', url: 'https://www.smartzone.lk/' },
    { id: 'singhagiri', name: 'Singhagiri', url: 'https://singhagiri.lk/' },
  ],
  macbook: [
    { id: 'ispot', name: 'iSpot', url: 'https://ispot.lk/' },
    { id: 'nanotek', name: 'Nanotek', url: 'https://www.nanotek.lk/' },
    { id: 'rooter', name: 'Rooter', url: 'https://rooter.lk/' },
    { id: 'sparktech', name: 'The Spark Tech', url: 'https://thesparktech.lk/' },
    { id: 'thundermac', name: 'Thundermac', url: 'https://www.thundermac.com/' },
    { id: 'chama', name: 'Chama Computers', url: 'http://chamacomputers.lk/' },
    { id: 'francium', name: 'Francium', url: 'https://www.francium.lk/' },
  ],
}
