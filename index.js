var postcss = require('postcss');
var extend = require('util')._extend;
var config = {
    suit: {
        separators: {
            namespace: '-',
            descendent: '-',
            modifier: '--',
            state: '.is-'
        }
    },
    bem: {
        separators: {
            namespace: '--',
            descendent: '__',
            modifier: '_'
        }
    },
    shortcuts: {}
};

module.exports = postcss.plugin('postcss-bem', function (opts) {
    opts = opts || {};

    if (!opts.style) {
        opts.style = 'suit';
    }

    if (opts.style !== 'suit' && opts.style !== 'bem') {
        throw new Error('postcss-bem: opts.style may only be "suit" or "bem"');
    }

    opts.shortcuts = extend(config.shortcuts, opts.shortcuts);

    var currentConfig = config[opts.style];

    if (opts.separators) {
        for (var customSeparator in opts.separators) {
            if (!opts.separators.hasOwnProperty(customSeparator)) continue;

            var separatorValue = opts.separators[customSeparator];
            if (typeof separatorValue === 'string') {
                currentConfig.separators[customSeparator] = separatorValue;
            } else {
                throw new Error('postcss-bem: opts.separators.' + customSeparator + ' must be a string');
            }
        }
    }

    function checkRuleMatches(name, rule) {
        return rule.name === name || !!opts.shortcuts[name] && rule.name === opts.shortcuts[name];
    }

    function processModifierOrDescendent(name, rule, container, after) {
        var separator;
        var newName;
        var last;
        var newRule;
        if (checkRuleMatches('modifier', rule)) {
            separator = currentConfig.separators.modifier;
        } else if (checkRuleMatches('descendent', rule)) {
            separator = currentConfig.separators.descendent;
        }

        if(separator) {
            newName = name + separator + rule.params;
            newRule = postcss.rule({
                selector: '.' + newName,
                source: rule.source
            });
            container.insertAfter(after, newRule);
            last = newRule;
            rule.each(function (node) {
                var subrule = false;
                if (node.type === 'atrule') {
                    subrule = processModifierOrDescendent(newName, node, container, last);
                }
                if (subrule) {
                    last = subrule;
                } else {
                    newRule.append(node);
                }
            });
            rule.remove();
            return last;
        }
        return false;
    }

    function processComponent (component, namespace) {
        var name = component.params;

        if (namespace) {
            name = namespace + currentConfig.separators.namespace + name;
        }

        var last = component;
        var newComponent = postcss.rule({
            selector: '.' + name,
            source: component.source
        });
        component.each(function (rule) {
            var newRule = false;

            if (rule.type === 'atrule') {
                newRule = processModifierOrDescendent(name, rule, component.parent, last);
            }
            if (newRule) {
                last = newRule;
            } else {
                newComponent.append(rule);
            }
        });

        component.replaceWith(newComponent);
    }

    return function (css, result) {
        var namespaces = {};

        if (opts.style === 'suit') {
            css.walkAtRules(function (utility) {
                if (!checkRuleMatches('utility', utility)) return;
                if (!utility.params) {
                    throw utility.error('No names supplied to @utility');
                }

                var utilityNames = postcss.list.comma(utility.params);

                var selector = utilityNames.map(function (params) {
                    params = postcss.list.space(params);
                    var variant;
                    var name;

                    if (params.length > 2) {
                        result.warn('Too many parameters for @utility', {
                            node: utility
                        });
                    }

                    name = 'u-';
                    if (params.length > 1) {
                        variant = params[1];

                        if (variant === 'small') {
                            name += 'sm';
                        } else if (variant === 'medium') {
                            name += 'md';
                        } else if (variant === 'large') {
                            name += 'lg';
                        } else {
                            result.warn('Unknown variant: ' + variant, {
                                node: utility
                            });
                        }
                        name += '-';
                    }
                    name += params[0];
                    return '.' + name;
                }).join(', ');

                var newUtility = postcss.rule({
                    selector: selector,
                    source: utility.source
                });

                utility.each(function (node) {
                    newUtility.append(node);
                });
                utility.replaceWith(newUtility);
            });
        }

        css.walkAtRules(function (namespace) {
            if ( !checkRuleMatches('component-namespace', namespace) ) return;
            var name = namespace.params;

            if (!namespace.nodes) {
                namespaces[namespace.source.input.file || namespace.source.input.id] = name;
                namespace.remove();
                return;
            }

            namespace.walkAtRules(function (component) {
                if ( !checkRuleMatches('component', component) ) return;
                processComponent(component, name);
            });

            var node = namespace.last;
            while (node) {
                namespace.after(node);
                node = namespace.last;
            }
            namespace.remove();
        });

        css.walkAtRules(function (component) {
            if ( !checkRuleMatches('component', component) ) return;
            var namespace = opts.defaultNamespace;
            var id = component.source.input.file || component.source.input.id;
            if (id in namespaces) {
                namespace = namespaces[id];
            }

            processComponent(component, namespace);
        });

        if (opts.style === 'suit') {
            css.walkAtRules(function (when) {
                if ( !checkRuleMatches('when', when)) return;
                var parent = when.parent;

                if (parent === css || parent.type !== 'rule') {
                    throw when.error('@when can only be used in rules which are not the root node');
                }

                var states = when.params;
                var newSelector = postcss.list.comma(parent.selector).map(function (selector) {
                    return postcss.list.comma(states).map(function (state) {
                        return selector + currentConfig.separators.state + state;
                    }).join(', ');
                }).join(', ');

                var newWhen = postcss.rule({
                    selector: newSelector,
                    source: when.source
                });

                when.each(function (node) {
                    newWhen.append(node);
                });
                parent.after(newWhen);
                when.remove();
            });
        }
    };
});
