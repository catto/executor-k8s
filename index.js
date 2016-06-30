'use strict';
const Executor = require('screwdriver-executor-base');
const fs = require('fs');
const request = require('request');
const tinytim = require('tinytim');
const yaml = require('js-yaml');
const API_KEY = fs.readFileSync('/etc/kubernetes/apikey', 'utf-8');
const SCM_URL_REGEX = /^git@([^:]+):([^\/]+)\/(.+?)\.git(#.+)?$/;
const GIT_ORG = 2;
const GIT_REPO = 3;
const GIT_BRANCH = 4;

const jobsUrl = 'https://kubernetes/apis/batch/v1/namespaces/default/jobs';

class K8sExecutor extends Executor {
    /**
     * Starts a k8s build
     * @method start
     * @param  {Object}   config            A configuration object
     * @param  {Object}   config.buildId    ID for the build
     * @param  {Object}   config.jobId      ID for the job
     * @param  {Object}   config.pipelineId ID for the pipeline
     * @param  {Object}   config.container  Container for the build to run in
     * @param  {Object}   config.scmUrl     Scm URL to use in the build
     * @param  {Function} callback Callback function
     */
    start(config, callback) {
        const scmMatch = config.scmUrl.match(SCM_URL_REGEX);
        const jobTemplate = tinytim.renderFile('./config/job.yaml.tim', {
            git_org: scmMatch[GIT_ORG],
            git_repo: scmMatch[GIT_REPO],
            git_branch: (scmMatch[GIT_BRANCH] || '#master').slice(1),
            job_name: 'main'
        });

        const options = {
            json: yaml.safeLoad(jobTemplate),
            headers: {
                Authorization: `Bearer ${API_KEY}`
            },
            strictSSL: false
        };

        request.post(jobsUrl, options, (err, resp, body) => {
            if (err) {
                return callback(err);
            }

            if (resp.statusCode !== 201) {
                return callback(body);
            }

            return callback(null, body);
        });
    }
}

module.exports = K8sExecutor;
