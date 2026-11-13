import { describe, expect, it } from 'vitest'
import { parseListing, parseSamsungModel, parseSizes } from './parse'

// Titles and option texts below are copied from the live sites (13 Nov 2026).

describe('iPhone', () => {
  const p = (t: string, o = '') => parseListing(t, o, 'iphone')
  it('reads LuxuryX variants', () => {
    expect(p('iPhone Duo', 'ram: 12 GB, storage: 512 GB')).toMatchObject({ model: 'iphone duo', storage: 512, ram: 12 })
    expect(p('iPhone 17e', 'ram: 8 GB, storage: 256 GB')).toMatchObject({ model: 'iphone 17e', storage: 256 })
    expect(p('iPhone 17', 'ram: 8 GB, storage: 256 GB, network: Physical SIM')).toMatchObject({ model: 'iphone 17', sim: 'Physical SIM' })
  })
  it('keeps Pro and Pro Max apart', () => {
    expect(p('Apple iPhone 17 Pro Max', 'SIM Type: eSIM, Capacity: 256GB, Colour: Silver')).toMatchObject({
      model: 'iphone 17 pro max',
      storage: 256,
      sim: 'eSIM',
    })
    expect(p('Apple iPhone 17 Pro 256GB Cosmic Orange')).toMatchObject({ model: 'iphone 17 pro', storage: 256 })
  })
  it('reads warranty', () => {
    expect(p('iPhone 18 Pro', 'Storage: 256GB, Warranty: Gnext')?.warranty).toBe('Official warranty')
    expect(p('iPhone Duo', 'Storage: 1TB, Warranty: Apple Care')).toMatchObject({ storage: 1024, warranty: 'Official warranty' })
  })
  it('prefers the labelled option over sizes listed in the title', () => {
    expect(p('Apple iPhone 15 (128GB, 256GB)', 'STORAGE: 128 GB, COLOUR: GREEN')?.storage).toBe(128)
    expect(p('iPhone 15 Pro (128GB / 256GB)', 'Capacity: 256GB, Color: Natural Titanium')?.storage).toBe(256)
    expect(p('Apple iPhone 17', 'COLOUR: BLUE, SIM: PHISYCAL SIM')?.sim).toBe('Physical SIM')
    expect(p('Francium Neo', '')).toBeNull()
  })
  it('leaves storage empty when it is not stated', () => {
    expect(p('Apple iPhone 17', 'Colour: Black, SIM Type: eSIM')?.storage).toBeNull()
  })
  it('skips accessories and used phones', () => {
    expect(p('iPhone 17 Pro Max Clear Case with MagSafe')).toBeNull()
    expect(p('Pre-Owned iPhone 13 128GB')).toBeNull()
  })
})

describe('Samsung', () => {
  const p = (t: string, o = '') => parseListing(t, o, 'samsung')
  it('reads RAM and storage in the common formats', () => {
    expect(p('Samsung Galaxy S26 Ultra (12GB RAM|256GB) Checking Warranty')).toMatchObject({
      model: 'galaxy s26 ultra',
      ram: 12,
      storage: 256,
      warranty: 'Company warranty',
    })
    expect(p('Samsung Galaxy A07 4G (4GB  RAM|128GB)')).toMatchObject({ model: 'galaxy a07 4g', ram: 4, storage: 128 })
    expect(p('Samsung Galaxy S26 Ultra 16GB + 1TB – Black')).toMatchObject({ ram: 16, storage: 1024 })
    expect(p('Galaxy S26 Ultra', 'Storage: 12GB RAM 256GB ROM, Color: Black')).toMatchObject({ ram: 12, storage: 256 })
    expect(p('Samsung Galaxy Z Fold8 Ultra', 'Storage: 12GB + 256GB, Color: Violet')).toMatchObject({ ram: 12, storage: 256 })
    expect(p('Samsung Galaxy Z Fold8', 'Product code: samsung galaxy z fold8 12gb ram 256gb')).toMatchObject({
      model: 'galaxy z fold8',
      ram: 12,
      storage: 256,
    })
  })
  it('treats 4G/5G as part of A-series models only (decision 9)', () => {
    expect(parseSamsungModel('Samsung Galaxy A07')).toBe('galaxy a07')
    expect(parseSamsungModel('Samsung Galaxy A07 4G (4GB RAM|64GB)')).toBe('galaxy a07 4g')
    expect(parseSamsungModel('SAMSUNG GALAXY A57 5G 12GB RAM | 256GB Storage (Gray)')).toBe('galaxy a57 5g')
    expect(parseSamsungModel('Samsung Galaxy A57 (12GB RAM|256GB)')).toBe('galaxy a57')
    expect(parseSamsungModel('Samsung Galaxy S26 FE 5G(8GB RAM|256GB)')).toBe('galaxy s26 fe')
  })
  it('reads plus, fold and ultra names', () => {
    expect(parseSamsungModel('Samsung Galaxy S26+')).toBe('galaxy s26 plus')
    expect(parseSamsungModel('Samsung Galaxy S26 Plus 12GB 256GB')).toBe('galaxy s26 plus')
    expect(parseSamsungModel('Samsung Galaxy Z Fold 8')).toBe('galaxy z fold8')
    expect(parseSamsungModel('Samsung Galaxy Z Fold8 Ultra 256GB')).toBe('galaxy z fold8 ultra')
  })
  it('skips tablets, watches and cases', () => {
    expect(p('Samsung Galaxy Tab S10 FE 5G 8GB 128GB – Gray')).toBeNull()
    expect(p('Samsung Galaxy Watch8 44mm')).toBeNull()
    expect(p('Galaxy S26 Ultra Silicone Case')).toBeNull()
  })
})

describe('MacBook', () => {
  const p = (t: string, o = '') => parseListing(t, o, 'macbook')
  it('reads LuxuryX titles and options', () => {
    expect(p('MacBook Pro 14 inch M5 Pro Chip', 'ram: 24 GB, storage: 1 TB, core: 15-core')).toMatchObject({
      family: 'pro',
      screen: 14,
      chip: 'm5 pro',
      cores: 15,
      ram: 24,
      storage: 1024,
      display: 'standard',
    })
    expect(p('MacBook Pro 14 inch M5 Pro Chip PROLED XDR Display', 'ram: 24 GB, storage: 1 TB, core: 18-core, model: Standard glass')).toMatchObject({
      display: 'oled',
      cores: 18,
      glass: 'standard',
    })
    expect(p('MacBook Pro 16 inch (M5 Pro)', 'ram: 48 GB, storage: 1 TB')).toMatchObject({ screen: 16, chip: 'm5 pro', cores: null })
    expect(p('MacBook Neo', 'ram: 8 GB, storage: 256 GB')).toMatchObject({ family: 'neo', ram: 8, storage: 256 })
  })
  it('reads competitor titles', () => {
    expect(p("MacBook Air M5 13'' | 16GB | 512GB | Silver")).toMatchObject({ family: 'air', screen: 13, chip: 'm5', ram: 16, storage: 512 })
    expect(p('Macbook M5 Air 15" |24GB | 1TB')).toMatchObject({ family: 'air', screen: 15, ram: 24, storage: 1024 })
    expect(p('APPLE MACBOOK AIR M5 13 24GB 1TB')).toMatchObject({ screen: 13, ram: 24, storage: 1024 })
    expect(p('M5 Pro MacBook Pro 14" 24GB 1TB')).toMatchObject({ chip: 'm5 pro', screen: 14, ram: 24, storage: 1024, cores: null })
    expect(p('14-inch MacBook Pro M5 Chip 16GB 512GB')).toMatchObject({ chip: 'm5', screen: 14 })
    expect(p('Macbook Pro M5 PRO 16-inch', 'Memory: 48GB, Storage: 2TB')).toMatchObject({ chip: 'm5 pro', screen: 16, ram: 48, storage: 2048 })
    expect(p('Macbook Pro M5 Chip 14 inch 16GB / 512GB (2025)')).toMatchObject({ screen: 14, ram: 16, storage: 512 })
    expect(p('MacBook Air M5 Chip 13 inch (2026)', 'Unified Memory: 24GB/1TB')).toMatchObject({ screen: 13, ram: 24, storage: 1024 })
    expect(
      p('MacBook Pro Apple M5 Max chip with 18-core CPU and 40-core GPU, 48GB, 2TB SSD - Space Black - MGEE4ZP/A'),
    ).toMatchObject({ chip: 'm5 max', cores: 18, screen: null, ram: 48, storage: 2048 })
    expect(p('Macbook Neo A18 Pro 8GB 256GB - Silver')).toMatchObject({ family: 'neo', ram: 8, storage: 256 })
    expect(p('MacBook Neo A18 13-inch', 'Color: Blush, Storage: 8GB 512GB Touch ID')).toMatchObject({ family: 'neo', ram: 8, storage: 512 })
  })
  it('skips used and accessory items', () => {
    expect(p('MacBook Pro i5 16GB | 256GB | 13" | Touch Bar | 2019 macOs (Used)')).toBeNull()
    expect(p('MacBook Air 13 Sleeve')).toBeNull()
  })
})

describe('sizes', () => {
  it('does not take RAM for storage', () => {
    expect(parseSizes('Galaxy A17 5G 8GB 128GB', 'samsung')).toEqual({ ram: 8, storage: 128 })
    expect(parseSizes('iPhone 16 128GB', 'iphone')).toEqual({ ram: null, storage: 128 })
    expect(parseSizes('MacBook Air 16GB', 'macbook')).toEqual({ ram: 16, storage: null })
  })
})
