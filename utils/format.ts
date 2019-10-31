export function pictures(pics: { [type: string]: string }) {
  const ep = Object.entries(pics).filter(([k]) => k.startsWith('pic'))
  if (ep.length === 0) return {}
  return ep.reduce((a, [k, v]) => {
    let size = k.replace(/pic|Jpeg|Webp/g, '').toLowerCase()
    return !v
      ? a
      : {
          ...a,
          [size]: {
            ...a[size],
            [k.includes('Jpeg') ? 'jpeg' : 'webp']: v,
          },
        }
  }, {})
}

export function mentor(data: any) {
  const [mentor, pics] = Object.entries(data).reduce(
    ([m, p], [k, v]) =>
      !k.startsWith('pic') ? [{ ...m, [k]: v }, p] : [m, { ...p, [k]: v }],
    [{}, {}]
  )
  return {
    ...mentor,
    pictures: pictures(pics),
  }
}
