const moment = require('moment')

/**
 * @description returns date difference given the first, the last and the frequency of events/slots
 * @param {any} maxDate 
 * @param {String} diffUnit - days, weeks, months, years, etc 
 */
function dateDiff(eventStart, maxDate, diffUnit) {
  let num = 0

  try {
    if(maxDate instanceof Date) {
      if(new Date(eventStart).getDate() != new Date(maxDate).getDate()) {
        num = Math.abs(moment(maxDate).diff(moment(eventStart), diffUnit)) + 1
      }
    } else if (typeof maxDate == 'number') {
      num = maxDate
    } else throw 'Invalid maximum date'
  } catch (err) {
    return err
  }

  return num
}


/**
 * @description Generates daily slots/events until the date specified or
 * the number specified of daily events
 * @param {Object} slot 
 * @param {Date} end 
 */

function genDaily(slot, end) {
  let num = dateDiff(slot.start, new Date(end), 'days'),
    i = 0,
    arr = []

  while(i <= num) {
    let newSlot = Object.assign({}, slot)

    // increment day
    newSlot.start = moment(slot.start).add(i, 'd').toDate()
    newSlot.end = moment(slot.end).add(i, 'd').toDate()
    
    arr.push(newSlot)
    i++
  }

  return arr
}

/**
 * @description Generates weekly slots/events until the date specified or
 * the number specified of weekly events
 * @param {Object} slot 
 * @param {Date} end
 */
function genWeekly(slot, end) {
  let num = dateDiff(slot.start, new Date(end), 'w'),
    i = 0,
    arr = []

  
  while(i <= num) {
    let newSlot = Object.assign({}, slot)
    newSlot.start = moment(slot.start).add(i, 'w').toDate()
    newSlot.end = moment(slot.end).add(i, 'w').toDate()

    arr.push(newSlot)
    i++
  }

  return arr
}

function automaticGenerate(slots, limitDate) {
  let arr = [];

  for(let slot of slots) {
    switch (slot.recurrency) {
    case 'Daily':
      arr = arr.concat(genDaily(slot, new Date(limitDate)))      
      break;
    case 'Weekly':
      arr = arr.concat(genWeekly(slot, new Date(limitDate)))
      break;
    }
  }

  return arr
}


module.exports.generateDailySlot = genDaily;
module.exports.generateWeeklySlot = genWeekly;
module.exports.generateSlots = automaticGenerate;