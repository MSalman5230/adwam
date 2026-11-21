const milestones = {
  'content:check': 'M1.6',
  'content:build': 'M1.6',
  'server:prepare': 'M5.5',
  'server:test': 'M5.11',
  'server:tick': 'M5.11',
  'server:simulate-rain': 'M5.11',
};

const script = process.argv[2];
console.log(`${script} is pending ${milestones[script]}.`);
if (script !== 'content:check') process.exitCode = 1;
