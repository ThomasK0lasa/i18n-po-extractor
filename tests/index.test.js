import {describe, it, before, after} from 'node:test';
import {cleanup, run} from './helpers.js';

// unit tests
import namespaceUnit from './unit/namespace.test.js';
import validateUnit from './unit/keys.test.js';
import configUnit from './unit/config.test.js';
import scanUnit from './unit/scan.test.js';

// integration tests — fake-project-custom-1 (main project)
import extraction from './integration/extraction.test.js';
import common from './integration/common.test.js';
import commonDisabled from './integration/common-disabled.test.js';
import references from './integration/references.test.js';
import namespaces from './integration/namespaces.test.js';
import namespaceHeader from './integration/namespace-header.test.js';
import merge from './integration/merge.test.js';
import secondaryRun from './integration/secondary-run.test.js';
import dynamic from './integration/dynamic.test.js';
import translatorComments from './integration/translator-comments.test.js';
import metadata from './integration/metadata.test.js';
import options from './integration/options.test.js';
import fileNamespace from './integration/file-namespace.test.js';
import rename from './integration/rename.test.js';
import validation from './integration/validation.test.js';

// fake project tests
import folderNamespace from './integration/project-folder-namespace.test.js';
import nodeBackend from './integration/project-node-backend.test.js';
import reactFileNamespace from './integration/project-file-namespace.test.js';
import singleNamespace from './integration/project-single-namespace.test.js';
import mixedNamespace from './integration/project-mixed-namespace.test.js';
import commonReroute from './integration/common-reroute.test.js';
import cli from './integration/cli.test.js';
import orphans from './integration/orphans.test.js';

// unit suites
describe('Unit — namespace', namespaceUnit);
describe('Unit — validate', validateUnit);
describe('Unit — config', configUnit);
describe('Unit — scan', scanUnit);

// integration suites — fake-project-custom-1
describe('fake-project-custom-1', (t) => {
    before(() => { cleanup(); run(); });
    after(() => cleanup());

    describe('Extraction', extraction);
    describe('Common keys', common);
    describe('Common disabled', commonDisabled);
    describe('Source references', references);
    describe('Namespaces', namespaces);
    describe('Namespace header', namespaceHeader);
    describe('Merge behavior', merge);
    describe('Secondary run', secondaryRun);
    describe('Dynamic keys', dynamic);
    describe('Translator comments', translatorComments);
    describe('Metadata preservation', metadata);
    describe('Options — context, plural, vars, ns', options);
    describe('Per-file namespace & ns routing', fileNamespace);
    describe('Rename detection', rename);
    describe('Key validation', validation);
});

// fake project boundary tests
describe('fake-project-custom-1 (folder namespace)', folderNamespace);
describe('fake-project-node (node backend + snake_case)', nodeBackend);
describe('fake-project-react (file namespace + camelCase)', reactFileNamespace);
describe('fake-project-simple-spa (single namespace)', singleNamespace);
describe('fake-project-custom-2 (mixed namespace)', mixedNamespace);
describe('Common reroute (namespaceInKey: false)', commonReroute);
describe('CLI', cli);
describe('Orphan detection', orphans);
