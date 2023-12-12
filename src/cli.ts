#!/usr/bin/env node

import { main } from './defender';

const run = async () => {
  await main(process.argv.slice(2));
};

void run();
