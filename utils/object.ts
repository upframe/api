export const fromEntries = (entries: [string, any][]): object =>
  entries.reduce((a, [k, v]) => ({ ...a, [k]: v }), {})

export const fromKeys = (keys: string[], value?: null): object =>
  fromEntries(keys.map(k => [k, value]))

export const mapKeys = (
  obj: object,
  func: (key: string, value: unknown) => string
): object => fromEntries(Object.entries(obj).map(([k, v]) => [func(k, v), v]))

export const mapValues = (
  obj: object,
  func: (value: unknown, key: string) => any
): object => fromEntries(Object.entries(obj).map(([k, v]) => [k, func(v, k)]))

export const map = (
  obj: object,
  func: (key: string, value: string) => [string, string]
): object => fromEntries(Object.entries(obj).map(([k, v]) => func(k, v)))

export const filterKeys = (
  obj: object,
  func: (key: string) => boolean
): object => fromEntries(Object.entries(obj).filter(([key]) => func(key)))

export const filterValues = (
  obj: object,
  func: (value: string) => boolean
): object => fromEntries(Object.entries(obj).filter(([, value]) => func(value)))

// interface for chaining object utility functions without extending object prototype
export class Custom {
  constructor(obj: Object) {
    Object.assign(this, obj)
  }

  static _mapStatic = <T extends Func>(func: T) => (...params: Parameters<T>) =>
    new Custom(func(...(params as any[])))
  static _mapFunc = <T extends Func>(obj: Custom, func: T) => (
    ...params: RemoveFirst<Parameters<T>>
  ) => new Custom(func(obj.value, ...params))

  static fromEntries = Custom._mapStatic(fromEntries)
  static fromKeys = Custom._mapStatic(fromKeys)
  map = Custom._mapFunc(this, map)
  mapKeys = Custom._mapFunc(this, mapKeys)
  mapValues = Custom._mapFunc(this, mapValues)
  filterKeys = Custom._mapFunc(this, filterKeys)
  filterValues = Custom._mapFunc(this, filterValues)

  get keys() {
    return Object.keys(this.value)
  }
  get value() {
    return filterKeys(
      this,
      k =>
        !['map', 'mapKeys', 'mapValues', 'filterKeys', 'filterValues'].includes(
          k
        )
    )
  }
}

type Func = (...args: any) => any
type RemoveFirst<T extends any[]> = T['length'] extends 0
  ? []
  : (((...b: T) => void) extends (a, ...b: infer I) => void ? I : [])
