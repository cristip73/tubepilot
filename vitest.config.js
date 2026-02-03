export default {
  test: {
    include: ['tests/**/*.test.ts'],
    testTimeout: 30000,
    globals: true,
    pool: 'forks',
  },
};
