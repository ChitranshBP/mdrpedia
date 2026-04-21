import EmbeddedPostgres from 'embedded-postgres';

const pg = new EmbeddedPostgres({
  databaseDir: './pg-data',
  user: 'postgres',
  password: 'postgres',
  port: 5433,
  persistent: true
});

try {
  await pg.initialise();
  console.log('PostgreSQL initialized');
  await pg.start();
  console.log('PostgreSQL started on port 5433');
  await pg.createDatabase('mdrpedia');
  console.log('Database "mdrpedia" created');
  console.log('URL: postgresql://postgres:postgres@localhost:5433/mdrpedia');
  console.log('\nPostgreSQL is running. Press Ctrl+C to stop.');

  // Keep the process alive
  process.on('SIGINT', async () => {
    console.log('\nStopping PostgreSQL...');
    await pg.stop();
    process.exit(0);
  });
} catch (err) {
  if (err.message && err.message.includes('already')) {
    console.log('PostgreSQL already initialized, starting...');
    await pg.start();
    console.log('PostgreSQL started on port 5433');
    try { await pg.createDatabase('mdrpedia'); } catch(e) { /* db exists */ }
    console.log('URL: postgresql://postgres:postgres@localhost:5433/mdrpedia');
    console.log('\nPostgreSQL is running. Press Ctrl+C to stop.');
    process.on('SIGINT', async () => {
      await pg.stop();
      process.exit(0);
    });
  } else {
    console.error('Error:', err.message);
    process.exit(1);
  }
}
