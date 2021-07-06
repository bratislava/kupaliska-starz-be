/* eslint-disable */

module.exports = {
  branches: [
    'master',
  ],
  plugins: [
    ['@semantic-release/commit-analyzer', {
      preset: 'angular',
      parserOpts: {
        noteKeywords: ['BREAKING CHANGE', 'BREAKING CHANGES', 'BREAKING'],
      },
    }],
    ['@semantic-release/release-notes-generator', {
      preset: 'angular',
      parserOpts: {
        noteKeywords: ['BREAKING CHANGE', 'BREAKING CHANGES', 'BREAKING'],
      },
    }],
    '@semantic-release/changelog',
    ['@semantic-release/git', {
      assets: [
        'CHANGELOG.md',
      ],
      message: 'docs(changelog): Update to ${nextRelease.version} [skip ci]',
    }],
    ['@semantic-release/exec', {
      prepareCmd: 'docker login -u "$CI_REGISTRY_USER" -p "$CI_REGISTRY_PASSWORD" $CI_REGISTRY && (docker pull -q "$CI_REGISTRY_IMAGE:latest" || true)',
    }],
    ['@codedependant/semantic-release-docker', {
      dockerTags: [
        'latest',
        '{git_sha}',
        '{version}',
        '{major}',
        '{major}.{minor}',
      ],
      dockerImage: process.env.CI_PROJECT_NAME,
      dockerRegistry: process.env.CI_REGISTRY,
      dockerProject: process.env.CI_PROJECT_NAMESPACE,
      dockerDockerfile: 'docker/Dockerfile.latest',
      dockerFile: 'docker/Dockerfile.latest',
    }],
    '@semantic-release/gitlab',
  ],
};
