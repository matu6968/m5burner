const path = require('path');

module.exports = {
  directories: {
    output: 'dist',
    buildResources: 'build'
  },
  mac: {
    target: ['dmg'],
    icon: 'assets/m5.icns',
    extraResources: [
      {
        from: 'deps',
        to: 'packages',
        filter: ['**/*']
      },
      {
        from: '.temp-build/packages',
        to: 'packages',
        filter: ['**/*']
      }
    ],
    files: [
      "**/*",
      "!**/node_modules/*/{CHANGELOG.md,README.md,README,readme.md,readme}",
      "!**/node_modules/*/{test,__tests__,tests,powered-test,example,examples}",
      "!**/node_modules/*.d.ts",
      "!**/node_modules/.bin",
      "!**/*.{iml,o,hprof,orig,pyc,pyo,rbc,swp,csproj,sln,xproj}",
      "!.editorconfig",
      "!**/._*",
      "!**/{.DS_Store,.git,.hg,.svn,CVS,RCS,SCCS,.gitignore,.gitattributes}",
      "!**/{__pycache__,thumbs.db,.flowconfig,.idea,.vs,.nyc_output}",
      "!**/{appveyor.yml,.travis.yml,circle.yml}",
      "!**/{npm-debug.log,yarn.lock,.yarn-integrity,.yarn-metadata.json}"
    ]
  },
  dmg: {
    icon: 'assets/m5.icns',
    iconSize: 128,
    contents: [
      {
        x: 130,
        y: 220
      },
      {
        x: 410,
        y: 220,
        type: 'link',
        path: '/Applications'
      }
    ],
    window: {
      width: 540,
      height: 380
    }
  }
}; 