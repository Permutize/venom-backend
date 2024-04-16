/* eslint-disable */
export default {
  // displayName: [{
  //   name: 'venom-backend',
  //   color: 'blue',
  // }],
  preset: '../../jest.preset.js',
  testEnvironment: 'node',
  transform: {
    '^.+\\.[tj]s$': ['ts-jest', { tsconfig: '<rootDir>/tsconfig.spec.json' }],
  },
  moduleFileExtensions: ['ts', 'js', 'html'],
  coverageDirectory: '../../coverage/apps/venom-backend',
};
