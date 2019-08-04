var postcss = require('postcss');
var expect  = require('chai').expect;

var plugin = require('../');

function process (input, opts) {
    return postcss([ plugin(opts) ]).process(input);
}

function test (input, output, opts, done) {
    process(input, opts).then(function (result) {
        expect(result.css).to.eql(output);
        expect(result.warnings()).to.be.empty;
        done();
    }).catch(function (error) {
        done(error);
    });
}

function testWarnings (input, output, warnings, opts, done) {
    process(input, opts).then(function (result) {
        var occuredWarnings = result.warnings();
        expect(result.css).to.eql(output);
        expect(occuredWarnings.length).to.be.equal(warnings.length);
        occuredWarnings.forEach(function (warning, i) {
            expect(warning.type).to.be.equal('warning');
            expect(warning.text).to.be.equal(warnings[i]);
        });
        done();
    }).catch(function (error) {
        done(error);
    });
}

function testErrors (input, reason, opts, done) {
    process(input, opts).then(function () {
        done(new Error('No errors thrown'));
    }).catch(function (error) {
        expect(error.constructor.name).to.be.equal('CssSyntaxError');
        expect(reason).to.be.equal(error.reason);
        done();
    });
}

describe('postcss-bem', function () {
    describe('suit', function () {
        describe('@utility', function() {
            it('works with name', function (done) {
                test('@utility utilityName {}', '.u-utilityName {}', {}, done);
            });

            it('works with multiple names', function (done) {
                test('@utility utilityName1, utilityName2 {}', '.u-utilityName1, .u-utilityName2 {}', {}, done);
            });

            it('works with small', function(done) {
                test('@utility utilityName small {}', '.u-sm-utilityName {}', {}, done);
            });

            it('works with medium', function(done) {
                test('@utility utilityName medium {}', '.u-md-utilityName {}', {}, done);
            });

            it('works with large', function(done) {
                test('@utility utilityName large {}', '.u-lg-utilityName {}', {}, done);
            });

            it('works with multiple names and sizes', function(done) {
                test('@utility utilityName1 small, utilityName2 medium, utilityName3 large {}',
                    '.u-sm-utilityName1, .u-md-utilityName2, .u-lg-utilityName3 {}',
                    {}, done);
            });

            it('throws when no args are supplied', function(done) {
                testErrors('@utility {}', 'No names supplied to @utility', {}, done);
            });

            it('warns when too many args are supplied', function(done) {
                testWarnings('@utility a small c {}', '.u-sm-a {}', ['Too many parameters for @utility'], {}, done);
            });

            it('warns when two args are supplied, the second of which is not allowed', function(done) {
                testWarnings('@utility a b {}', '.u--a {}', ['Unknown variant: b'], {}, done);
            });
        });

        describe('@component-namespace', function () {
            it('should get removed when empty', function (done) {
                test('@component-namespace nmsp {}', '', {}, done);
            });
        });

        describe('@component', function() {
            it('works without properties', function (done) {
                test('@component ComponentName {}', '.ComponentName {}', {}, done);
            });

            it('works with properties', function (done) {
                test(
                    '@component ComponentName {color: red; text-align: right;}',
                    '.ComponentName {color: red; text-align: right\n}',
                    {},
                    done
                );
            });

            it('works in @component-namespace', function (done) {
                test(
                    '@component-namespace nmsp {@component ComponentName {color: red; text-align: right;}}',
                    '.nmsp-ComponentName {color: red; text-align: right\n}',
                    {},
                    done
                );
            });

            it('works after file-level @component-namespace', function (done) {
                test(
                    '@component-namespace nmsp; @component ComponentName {color: red; text-align: right;}',
                    '.nmsp-ComponentName {color: red; text-align: right\n}',
                    {},
                    done
                );
            });

            it('works with default namespace', function (done) {
                test(
                    '@component ComponentName {color: red; text-align: right;}',
                    '.nmmmmsp-ComponentName {color: red; text-align: right\n}',
                    {
                        defaultNamespace: 'nmmmmsp'
                    },
                    done
                );
            });

            it('works in @component-namespace with default namespace', function (done) {
                test(
                    '@component-namespace nmsp {@component ComponentName {color: red; text-align: right;}}',
                    '.nmsp-ComponentName {color: red; text-align: right\n}',
                    {
                        defaultNamespace: 'nmmmmsp'
                    },
                    done
                );
            });
        });

        describe('@modifier', function() {
            it('works without properties', function (done) {
                test(
                    '@component ComponentName {@modifier modifierName {}}',
                    '.ComponentName {}\n.ComponentName--modifierName {}',
                    {},
                    done
                );
            });

            it('works with properties', function (done) {
                test(
                    '@component ComponentName {color: red; text-align: right;'
                        + '@modifier modifierName {color: blue; text-align: left;}}',
                    '.ComponentName {color: red; text-align: right\n}\n.'
                        + 'ComponentName--modifierName {color: blue; text-align: left\n}',
                    {},
                    done
                );
            });
        });

        describe('@descendent', function() {
            it('works without properties', function (done) {
                test(
                    '@component ComponentName {@descendent descendentName {}}',
                    '.ComponentName {}\n.ComponentName-descendentName {}',
                    {},
                    done
                );
            });

            it('works with properties', function (done) {
                test(
                    '@component ComponentName {color: red; text-align: right;'
                        + '@descendent descendentName {color: blue; text-align: left;}}',
                    '.ComponentName {color: red; text-align: right\n}\n'
                        + '.ComponentName-descendentName {color: blue; text-align: left\n}',
                    {},
                    done
                );
            });
        });

        describe('@when', function() {
            it('works without properties', function (done) {
                test(
                    '@component ComponentName {@when stateName {}}',
                    '.ComponentName {}\n.ComponentName.is-stateName {}',
                    {},
                    done
                );
            });

            it('works with properties', function (done) {
                test(
                    '@component ComponentName {color: red; text-align: right;'
                        + '@when stateName {color: blue; text-align: left;}}',
                    '.ComponentName {color: red; text-align: right\n}\n.'
                        + 'ComponentName.is-stateName {color: blue; text-align: left\n}',
                    {},
                    done
                );
            });

            it('can be used in any selector', function (done) {
                test(
                    '.ComponentName {color: red; text-align: right;'
                        + '@when stateName {color: blue; text-align: left;}}',
                    '.ComponentName {color: red; text-align: right}\n.'
                        + 'ComponentName.is-stateName {color: blue; text-align: left}',
                    {},
                    done
                );
            });

            it('can not be used in root', function (done) {
                testErrors(
                    '@when stateName {color: blue; text-align: left;}',
                    '@when can only be used in rules which are not the root node',
                    {},
                    done
                );
            });
        });
    });

    describe('bem', function () {
        var useBem = {
            style: 'bem'
        };

        describe('@utility', function() {
            it('does nothing', function (done) {
                test('@utility utilityName {}', '@utility utilityName {}', useBem, done);
            });
        });

        describe('@component-namespace', function () {
            it('should get removed when empty', function (done) {
                test('@component-namespace nmsp {}', '', useBem, done);
            });
        });

        describe('@component', function() {
            it('works without properties', function (done) {
                test('@component component-name {}', '.component-name {}', useBem, done);
            });

            it('works with properties', function (done) {
                test(
                    '@component component-name {color: red; text-align: right;}',
                    '.component-name {color: red; text-align: right\n}',
                    useBem,
                    done
                );
            });

            it('works in @component-namespace', function (done) {
                test(
                    '@component-namespace nmsp {@component component-name {color: red; text-align: right;}}',
                    '.nmsp--component-name {color: red; text-align: right\n}',
                    useBem,
                    done
                );
            });

            it('works after file-level @component-namespace', function (done) {
                test(
                    '@component-namespace nmsp; @component component-name {color: red; text-align: right;}',
                    '.nmsp--component-name {color: red; text-align: right\n}',
                    useBem,
                    done
                );
            });

            it('works with default namespace', function (done) {
                test(
                    '@component component-name {color: red; text-align: right;}',
                    '.nmmmmsp--component-name {color: red; text-align: right\n}',
                    {
                        defaultNamespace: 'nmmmmsp',
                        style: 'bem'
                    },
                    done
                );
            });

            it('works in @component-namespace with default namespace', function (done) {
                test(
                    '@component-namespace nmsp {@component component-name {color: red; text-align: right;}}',
                    '.nmsp--component-name {color: red; text-align: right\n}',
                    {
                        defaultNamespace: 'nmmmmsp',
                        style: 'bem'
                    },
                    done
                );
            });
        });

        describe('@modifier', function() {
            it('works without properties', function (done) {
                test(
                    '@component component-name {@modifier modifier-name {}}',
                    '.component-name {}\n.component-name_modifier-name {}',
                    useBem,
                    done
                );
            });

            it('works with properties', function (done) {
                test(
                    '@component component-name {color: red; text-align: right;'
                        + '@modifier modifier-name {color: blue; text-align: left;}}',
                    '.component-name {color: red; text-align: right\n}\n'
                        + '.component-name_modifier-name {color: blue; text-align: left\n}',
                    useBem,
                    done
                );
            });
        });

        describe('@descendent', function() {
            it('works without properties', function (done) {
                test(
                    '@component component-name {@descendent descendent-name {}}',
                    '.component-name {}\n.component-name__descendent-name {}',
                    useBem,
                    done
                );
            });

            it('works with properties', function (done) {
                test(
                    '@component component-name{color: red; text-align: right;'
                        + '@descendent descendent-name {color: blue; text-align: left;}}',
                    '.component-name {color: red; text-align: right\n}\n'
                        + '.component-name__descendent-name {color: blue; text-align: left\n}',
                    useBem,
                    done
                );
            });
        });

        describe('@when', function() {
            it('does nothing', function (done) {
                test(
                    '@component component-name {@when stateName {}}',
                    '.component-name {@when stateName {}\n}',
                    useBem,
                    done
                );
            });
        });
    });
});
