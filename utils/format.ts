import { Custom as Obj, filterKeys } from './object'
import { Mentor } from '../types'

// sort pictures into size -> type -> url structure
export function pictures(data: object): Mentor['pictures'] {
  let pics = new Obj(data)
    .filterKeys(k => k.startsWith('pic'))
    .mapKeys(k => k.replace('pic', '').toLowerCase())
    .filterValues(v => v !== null)

  const [jpeg, webp] = ['jpeg', 'webp'].map(type =>
    pics.filterKeys(k => k.endsWith(type)).mapKeys(k => k.replace(type, ''))
  )

  return Obj.fromKeys(jpeg.keys).mapValues((v, k) => ({
    jpeg: jpeg[k],
    webp: webp[k],
  })).value as Mentor['pictures']
}

// extract pictures from mentor into pictures property
export function mentor(data: object): Mentor {
  return {
    ...(filterKeys(data, k => !k.startsWith('pic')) as Mentor),
    pictures: pictures(data),
  }
}
