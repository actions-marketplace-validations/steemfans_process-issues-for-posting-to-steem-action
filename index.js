const assert = require('assert');
const core = require('@actions/core');
const github = require('@actions/github');
const utils = require('./utils');
const moment = require('moment-timezone');

async function main() {
  const token = core.getInput('token');
  const repo = core.getInput('repo');
  const owner = core.getInput('owner');
  const tz = core.getInput('tz');

  const octokit = github.getOctokit(token);
  const issueList = await octokit.rest.issues.listForRepo({
    owner,
    repo,
    state: 'open',
    direction: 'asc',
    per_page: 100,
    page: 1,
  });

  console.log('issueList:', issueList);

  if (issueList.data.length === 0) {
    core.setOutput('issue_id', 0);
    return;
  }

  let result;
  let result_issue_numer;

  const now = moment().utc();
  console.log('current_utc_date:', now);

  issueList.data.forEach(post => {
    const bodyInfo = utils.parseContent(post.body);
    if (!bodyInfo.info.date && result === undefined) {
      result = bodyInfo;
      result_issue_numer = post.number;
    } else {
      const scheduleDate = moment.tz(bodyInfo.info.date, tz).utc();
      console.log('issue_schedule_utc_date:', scheduleDate, bodyInfo.info);
      if (now.isBefore(scheduleDate)) {
        if (result === undefined) {
          result = bodyInfo;
          result_issue_numer = post.number;
        } else {
          const resultDate = moment.tz(result.info.date, tz).utc();
          if (scheduleDate.isBefore(resultDate)) {
            result = bodyInfo;
            result_issue_numer = post.number;
          }
        }
      }
    }
  });

  core.setOutput('issue_id', result_issue_numer);
  core.setOutput('title', result.info.title);
  core.setOutput('tags', result.info.tags);
  core.setOutput('reward', result.info.reward);
  core.setOutput('content', result.content);
  return;
}

main();
