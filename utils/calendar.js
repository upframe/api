/**
 * @description Generates daily slots/events until the date specified or
 * the number specified of daily events
 * @param {Object} slot 
 * @param {Date} until 
 */

function genDaily(slot, until) {
  let i = 0

  // get number of days until which to generate daily slots/events
  if(typeof until == 'string') i = Math.ceil((new Date(until) - Date.now()) / 864e5)
  else i = until

  let slotsArr = [],
    day = new Date(new Date(slot.start).setDate(slot.start.getDate() + i))

  // create slots/events from the last to the first
  while(i >= 0) {
    let newSlot = Object.assign({}, slot)

    // set start and end day
    newSlot.start = new Date(day)
    newSlot.end = new Date(day)
    slotsArr.push(newSlot)

    day = new Date(new Date(slot.start).setDate(slot.start.getDate() + --i))
  }

  return slotsArr
}

function genWeekly(slot, until) {
  let i = 0

  if(typeof until == 'string') i = Math.floor((new Date(until) - Date.now()) / 864e5 / 7)
  else i = until

  let slotsArr = []
    day = new Date(new Date(slot.start).setDate(slot.start.getDate() + i*7))
  
  // create slots/events from the last to the first
  while(i >= 0) {
    let newSlot = Object.assign({}, slot)

    newSlot.start = new Date(day)
    newSlot.end = new Date(day)
    slotsArr.push(newSlot)

    day = new Date(new Date(slot.start).setDate(slot.start.getDate() + (--i)*7))
  }

  return slotsArr
}


module.exports.generateDailySlot = genDaily;
module.exports.generateWeeklySlot = genWeekly;