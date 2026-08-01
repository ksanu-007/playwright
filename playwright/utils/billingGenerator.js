const FIRST_NAMES = ['James', 'Mary', 'John', 'Patricia', 'Robert', 'Jennifer', 'Michael', 'Linda', 'David', 'Elizabeth'];
const LAST_NAMES = ['Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Garcia', 'Miller', 'Davis', 'Rodriguez', 'Martinez'];
const STREETS = ['Oak St', 'Maple Ave', 'Main St', 'Broadway', 'Park Ave', 'Elm St', 'Cedar Ln', 'Pine Dr', 'Lake Rd', 'Hill St'];
const CITIES = ['New York', 'Los Angeles', 'Chicago', 'Houston', 'Phoenix', 'Philadelphia', 'San Antonio', 'San Diego', 'Dallas', 'Austin'];
const STATES = ['CA', 'NY', 'TX', 'FL', 'IL', 'PA', 'OH', 'GA', 'NC', 'MI'];
const ZIP_CODES = ['10001', '90001', '60601', '77001', '85001', '19101', '78201', '92101', '75201', '73301'];

function pickRandom(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function randomPhone() {
  const area = Math.floor(Math.random() * 900) + 100;
  const prefix = Math.floor(Math.random() * 900) + 100;
  const line = Math.floor(Math.random() * 9000) + 1000;
  return `${area}-${prefix}-${line}`;
}

export function generateBillingDetails() {
  const first = pickRandom(FIRST_NAMES);
  const last = pickRandom(LAST_NAMES);
  return {
    name: `${first} ${last}`,
    address: `${Math.floor(Math.random() * 9999) + 1} ${pickRandom(STREETS)}`,
    city: pickRandom(CITIES),
    state: pickRandom(STATES),
    zip: pickRandom(ZIP_CODES),
    phone: randomPhone(),
  };
}
