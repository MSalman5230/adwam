const milestones = {
  'server:test': 'M5.11',
  'server:tick': 'M5.11',
  'server:simulate-rain': 'M5.11',
};

const script = process.argv[2];
console.log(`${script} is pending ${milestones[script]}.`);
process.exitCode = 1;
