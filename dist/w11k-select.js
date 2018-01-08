/**
 * @version v0.11.3
 * @link https://github.com/w11k/w11k-select
 * @license MIT License, http://www.opensource.org/licenses/MIT
 */
(function (global, factory) {
    typeof exports === 'object' && typeof module !== 'undefined' ? factory(exports, require('angular')) :
    typeof define === 'function' && define.amd ? define(['exports', 'angular'], factory) :
    (factory((global['w11k-select'] = global['w11k-select'] || {}),global.angular));
}(this, (function (exports,angular) { 'use strict';

w11kSelect.$inject = ["w11kSelectConfig", "$parse", "$document", "w11kSelectHelper", "$filter", "$timeout", "$window", "$q"];
w11kSelectOptionDirective.$inject = ["w11kSelectConfig"];
w11kSelectInfiniteScroll.$inject = ["$timeout"];
var ConfigCommon = (function () {
    function ConfigCommon() {
        this.templateUrl = 'w11k-select.tpl.html';
        this.templateUrlOptions = 'w11k-select-option.tpl.html';
    }
    return ConfigCommon;
}());
var ConfigInstance = (function () {
    function ConfigInstance() {
        /** for form validation */
        this.required = false;
        /** Hide checkboxes during single selection */
        this.hideCheckboxes = false;
        /** single or multiple select */
        this.multiple = true;
        /** force ngModel to be an array for single select too */
        this.forceArrayOutput = false;
        /** disable user interaction */
        this.disabled = false;
        /** all the configuration for the header (visible if dropdown closed) */
        this.header = {
            /** text to show if no item selected (plain text, no evaluation, no data-binding) */
            placeholder: '',
            /**
             * text to show if item(s) selected (expression, evaluated against user scope)
             * make sure to enclose your expression withing quotes, otherwise it will be evaluated too early
             * default: undefined evaluates to a comma separated representation of selected items
             * example: ng-model='options.selected' w11k-select-config='{header: {placeholder: 'options.selected.length'}}'
             */
            text: undefined
        };
        this.dropdown = {
            onOpen: undefined,
            onClose: undefined
        };
        /** all the configuration for the filter section within the dropdown */
        this.filter = {
            /** activate filter input to search for options */
            active: true,
            /** text to show if no filter is applied */
            placeholder: 'Filter',
            /** 'select all filtered options' button */
            select: {
                /** show select all button */
                active: true,
                /**
                 * label for select all button
                 * default: undefined evaluates to 'all'
                 */
                text: undefined
            },
            /** 'deselect all filtered options' button */
            deselect: {
                /** show deselect all button */
                active: true,
                /**
                 * label for deselect all button
                 * default: undefined evaluates to 'none'
                 */
                text: undefined
            }
        };
        /** values for dynamically calculated styling of dropdown */
        this.style = {
            /** margin-bottom for automatic height adjust */
            marginBottom: '10px',
            /** static or manually calculated max height (disables internal height calculation) */
            maxHeight: undefined
        };
        /** when set to true, the clear-button is always visible. */
        this.showClearAlways = false;
        /** when set to true, we force the view value and external value to be null rather than undefined when 0 options are selected */
        this.useNullableModel = false;
    }
    return ConfigInstance;
}());
var Config = (function () {
    function Config(common, instance) {
        this.common = common || new ConfigCommon();
        this.instance = instance || new ConfigInstance();
    }
    return Config;
}());

/** @internal */
var W11KSelectHelper = (function () {
    W11KSelectHelper.$inject = ["$parse", "$document"];
    function W11KSelectHelper($parse, $document) {
        'ngInject';
        this.$parse = $parse;
        this.$document = $document;
        //               value                 as    label                for       item              in    collection                    |  filter                        track by     tracking
        this.OPTIONS_EXP = /^([a-zA-Z][\w\.]*)(?:\s+as\s+([a-zA-Z][\w\.]*))?\s+for\s+(?:([a-zA-Z][\w]*))\s+in\s+([$_a-zA-Z][\w\.\(\)]*(?:\s+\|\s[a-zA-Z][\w\:_\{\}']*)*)(?:\s+track\sby\s+([a-zA-Z][\w\.]*))?$/;
    }
    W11KSelectHelper.prototype.extendDeep = function (dst) {
        var _this = this;
        var otherArgs = [];
        for (var _i = 1; _i < arguments.length; _i++) {
            otherArgs[_i - 1] = arguments[_i];
        }
        angular.forEach(otherArgs, function (obj) {
            if (obj !== dst) {
                angular.forEach(obj, function (value, key) {
                    if (dst[key] && dst[key].constructor && dst[key].constructor === Object) {
                        _this.extendDeep(dst[key], value);
                    }
                    else {
                        dst[key] = value;
                    }
                });
            }
        });
        return dst;
    };
    W11KSelectHelper.prototype.hashCode = function (value) {
        var valueAsString;
        if (typeof value === 'object') {
            valueAsString = angular.toJson(value);
        }
        else {
            valueAsString = value.toString();
        }
        var hash = 0;
        var length = valueAsString.length;
        for (var i = 0; i < length; i++) {
            hash = valueAsString.charCodeAt(i) + (hash << 6) + (hash << 16) - hash;
        }
        return hash.toString(36);
    };
    W11KSelectHelper.prototype.parseOptions = function (input) {
        var match = input.match(this.OPTIONS_EXP);
        if (!match) {
            var expected = '"item.value" [as "item.label"] for "item" in "collection [ | filter ] [track by item.value.unique]"';
            throw new Error('Expected options in form of \'' + expected + '\' but got "' + input + '".');
        }
        var result = {
            value: this.$parse(match[1]),
            label: this.$parse(match[2] || match[1]),
            item: match[3],
            collection: this.$parse(match[4])
        };
        if (match[5] !== undefined) {
            result.tracking = this.$parse(match[5]);
        }
        return result;
    };
    W11KSelectHelper.prototype.getParent = function (element$$1, selector) {
        // with jQuery
        if (angular.isFunction(element$$1.parents)) {
            var container = element$$1.parents(selector);
            if (container.length > 0) {
                return container[0];
            }
            return;
        }
        // without jQuery
        var matchesSelector = 'MatchesSelector';
        var matchFunctions = [
            'matches',
            'matchesSelector',
            'moz' + matchesSelector,
            'webkit' + matchesSelector,
            'ms' + matchesSelector,
            'o' + matchesSelector
        ];
        for (var index in matchFunctions) {
            var matchFunction = matchFunctions[index];
            if (angular.isFunction(element$$1[0][matchFunction])) {
                var parent1 = element$$1[0].parentNode;
                while (parent1 !== this.$document[0]) {
                    if (parent1[matchFunction](selector)) {
                        return parent1;
                    }
                    parent1 = parent1.parentNode;
                }
                return;
            }
        }
        return;
    };
    return W11KSelectHelper;
}());

var OptionState;
(function (OptionState) {
    OptionState[OptionState["unselected"] = 0] = "unselected";
    OptionState[OptionState["selected"] = 1] = "selected";
    OptionState[OptionState["childsSelected"] = 2] = "childsSelected";
})(OptionState || (OptionState = {}));

function setSelected(options, selected) {
    var i = options.length;
    while (i--) {
        options[i].selected = selected;
        options[i].state = selected ? OptionState.selected : OptionState.unselected;
        setSelected(options[i].children || [], selected);
    }
}
// Sets all options to selected (deep) where isSearchResultOrParent is true
function setFilteredSelected(options) {
    options.forEach(function (option) {
        option.selected = option.isSearchResultOrParent;
        option.state = option.selected ? OptionState.selected : OptionState.unselected;
        setFilteredSelected(option.children || []);
    });
}

function externalOption2value(option, optionsExpParsed) {
    var context = {};
    context[optionsExpParsed.item] = option;
    return optionsExpParsed.value(context);
}

function internalOption2value(option, optionsExpParsed) {
    return externalOption2value(option.model, optionsExpParsed);
}

function internalOptions2externalModel(options, optionsExpParsed, config) {
    var arr = [];
    options.forEach(function (option) { return traverse(option, arr, optionsExpParsed); });
    return arr;
}
function traverse(option, arr, optionsExpParsed) {
    if (option.state === OptionState.selected) {
        arr.push(internalOption2value(option, optionsExpParsed));
    }
    option.children.forEach(function (option) { return traverse(option, arr, optionsExpParsed); });
}

function value2trackingId(value, w11kSelectHelper, optionsExpParsed) {
    if (optionsExpParsed.tracking !== undefined) {
        var context = {};
        var assignValueFn = optionsExpParsed.value.assign;
        assignValueFn(context, value);
        var trackingValue = optionsExpParsed.tracking(context);
        if (trackingValue === undefined) {
            throw new Error('Couldn\'t get \'track by\' value. Please make sure to only use something in \'track by’ part of w11kSelectOptions expression, accessible from result of value part. (\'option.data\' and \'option.data.unique\' but not \'option.unique\')');
        }
        return trackingValue.toString();
    }
    else {
        return w11kSelectHelper.hashCode(value);
    }
}

function externalOption2label(option, optionsExpParsed) {
    var context = {};
    context[optionsExpParsed.item] = option;
    return optionsExpParsed.label(context);
}

var InternalOption = (function () {
    function InternalOption(trackingId, label, model, selected, state, children, parent) {
        this.trackingId = trackingId;
        this.label = label;
        this.model = model;
        this.selected = selected;
        this.state = state;
        this.children = children;
        this.parent = parent;
        this.isSearchResultOrParent = true;
    }
    return InternalOption;
}());

function externalOptions2internalOptions(externalOptions, viewValue, w11kSelectHelper, optionsExpParsed, config) {
    var viewValueIDs = {};
    var i = viewValue.length;
    while (i--) {
        var trackingId = value2trackingId(viewValue[i], w11kSelectHelper, optionsExpParsed);
        viewValueIDs[trackingId] = true;
    }
    function prepareOptions(externalOption, parent) {
        var value = externalOption2value(externalOption, optionsExpParsed);
        var trackingId = value2trackingId(value, w11kSelectHelper, optionsExpParsed);
        var label = externalOption2label(externalOption, optionsExpParsed);
        var internalOption = new InternalOption(trackingId, label, externalOption, !!viewValueIDs[trackingId], viewValueIDs[trackingId] ? OptionState.selected : OptionState.unselected, [], parent || null);
        if (externalOption[config.children]) {
            internalOption.children = externalOption[config.children].map(function (child) { return prepareOptions(child, trackingId); });
        }
        return internalOption;
    }
    return externalOptions.map(prepareOptions);
}

function collectActiveLabels(option, labelArray) {
    if (option.state === OptionState.selected) {
        labelArray.push(option.label);
    }
    option.children.forEach(function (option) { return collectActiveLabels(option, labelArray); });
}

function buildInternalOptionsMap(internalOptions, internalOptionsMap) {
    internalOptions.forEach(function (option) {
        if (internalOptionsMap[option.trackingId]) {
            throw new Error('Duplicate hash value for options ' + option.label + ' and ' + internalOptionsMap[option.trackingId].label);
        }
        internalOptionsMap[option.trackingId] = option;
        if (option.children) {
            buildInternalOptionsMap(option.children, internalOptionsMap);
        }
    });
}

// Checks whether an array exists and contains items
// Checks whether an array exists and contains items
function arrayExistsAndContains(arr) {
    return !!arr && arr.length > 0;
}

var filterInternals = function (resourceList, searchStr) {
    return resourceList.map(function (it) {
        if (arrayExistsAndContains(it.children)) {
            it.children = filterInternals(it.children, searchStr);
        }
        it.isSearchResultOrParent = it.label.toString().toLowerCase().includes(searchStr) || ContainsResult(it.children);
        return it;
    });
};
function ContainsResult(resource) {
    return resource.some(function (resource) { return resource.isSearchResultOrParent || ContainsResult(resource.children); });
}

/** @internal */
function w11kSelect(w11kSelectConfig, $parse, $document, w11kSelectHelper, $filter, $timeout, $window, $q) {
    'ngInject';
    var jqWindow = angular.element($window);
    return {
        restrict: 'A',
        replace: false,
        templateUrl: w11kSelectConfig.common.templateUrl,
        scope: {},
        require: 'ngModel',
        controller: ["$scope", "$attrs", "$parse", function ($scope, $attrs, $parse) {
            if ($attrs.w11kSelect && $attrs.w11kSelect.length > 0) {
                var exposeExpression = $parse($attrs.w11kSelect);
                if (exposeExpression.assign) {
                    exposeExpression.assign($scope.$parent, this);
                }
            }
            this.open = function () {
                $scope.dropdown.open();
            };
            this.close = function () {
                $scope.dropdown.close();
            };
            this.toggle = function () {
                $scope.dropdown.toggle();
            };
        }],
        compile: function (tElement, tAttrs) {
            var configExpParsed = $parse(tAttrs.w11kSelectConfig);
            var optionsExpParsed = w11kSelectHelper.parseOptions(tAttrs.w11kSelectOptions);
            var ngModelSetter = $parse(tAttrs.ngModel).assign;
            var assignValueFn = optionsExpParsed.value.assign;
            if (optionsExpParsed.tracking !== undefined && assignValueFn === undefined) {
                throw new Error('value part of w11kSelectOptions expression must be assignable if \'track by\' is used');
            }
            return function (scope, iElement, iAttrs, controller) {
                var domElement = iElement[0];
                /* * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * *
                 * internal model
                 * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * */
                var optionsAlreadyRead;
                var ngModelAlreadyRead = false;
                var hasBeenOpened = false;
                var internalOptions = [];
                var internalOptionsMap = {};
                var optionsFiltered = [];
                scope.options = {
                    visible: []
                };
                scope.filter = {
                    values: {}
                };
                scope.config = angular.copy(w11kSelectConfig.instance);
                // marker to read some parts of the config only once
                var configRead = false;
                scope.$watch(function () {
                    return configExpParsed(scope.$parent);
                }, function (newConfig) {
                    if (angular.isArray(newConfig)) {
                        w11kSelectHelper.extendDeep.apply(w11kSelectHelper, [scope.config].concat(newConfig));
                        applyConfig();
                    }
                    else if (angular.isObject(newConfig)) {
                        w11kSelectHelper.extendDeep(scope.config, newConfig);
                        applyConfig();
                    }
                }, true);
                function applyConfig() {
                    optionsAlreadyRead.then(function () {
                        checkSelection();
                        updateNgModel();
                        checkConfig(scope.config, setViewValue);
                    });
                    if (!configRead) {
                        updateStaticTexts();
                        configRead = true;
                    }
                }
                function updateStaticTexts() {
                    if (scope.config.filter.select.active && scope.config.filter.select.text !== null && typeof (scope.config.filter.select.text) !== 'undefined') {
                        var selectFilteredButton = domElement.querySelector('.select-filtered-text');
                        selectFilteredButton.textContent = scope.config.filter.select.text;
                    }
                    if (scope.config.filter.deselect.active && scope.config.filter.deselect.text !== null && typeof (scope.config.filter.deselect.text) !== 'undefined') {
                        var deselectFilteredButton = domElement.querySelector('.deselect-filtered-text');
                        deselectFilteredButton.textContent = scope.config.filter.deselect.text;
                    }
                    if (scope.config.header.placeholder !== null && typeof (scope.config.header.placeholder) !== 'undefined') {
                        var headerPlaceholder = domElement.querySelector('.header-placeholder');
                        headerPlaceholder.textContent = scope.config.header.placeholder;
                    }
                }
                function checkSelection() {
                    if (scope.config.multiple === false) {
                        var selectedOptions = internalOptions.filter(function (option) { return option.state === OptionState.selected; });
                        if (selectedOptions.length > 0) {
                            setSelected(selectedOptions, false);
                            selectedOptions[0].state = OptionState.selected;
                        }
                    }
                }
                /* * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * *
                 * dropdown
                 * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * */
                var domDropDownMenu = domElement.querySelector('.dropdown-menu');
                var domDropDownContent = domElement.querySelector('.dropdown-menu .content');
                var domHeightAdjustContainer = w11kSelectHelper.getParent(iElement, '.w11k-select-adjust-height-to');
                var domHeaderText = domElement.querySelector('.header-text');
                function onEscPressed(event) {
                    if (event.keyCode === 27) {
                        if (scope.dropdown.close) {
                            scope.dropdown.close();
                        }
                    }
                }
                function adjustHeight() {
                    if (angular.isDefined(scope.config.style.maxHeight)) {
                        domDropDownContent.style.maxHeight = scope.config.style.maxHeight;
                    }
                    else {
                        var maxHeight = calculateDynamicMaxHeight();
                        domDropDownContent.style.maxHeight = maxHeight + 'px';
                    }
                }
                function resetHeight() {
                    domDropDownContent.style.maxHeight = '';
                }
                function calculateDynamicMaxHeight() {
                    var maxHeight;
                    var contentOffset = domDropDownContent.getBoundingClientRect().top;
                    var windowHeight = $window.innerHeight || $window.document.documentElement.clientHeight;
                    var containerHeight;
                    var containerOffset;
                    if (angular.isDefined(domHeightAdjustContainer)) {
                        containerHeight = domHeightAdjustContainer.innerHeight || domHeightAdjustContainer.clientHeight;
                        containerOffset = domHeightAdjustContainer.getBoundingClientRect().top;
                    }
                    else {
                        containerHeight = $window.innerHeight || $window.document.documentElement.clientHeight;
                        containerOffset = 0;
                    }
                    if (scope.config.style.marginBottom.indexOf('px') < 0) {
                        throw new Error('Illegal Value for w11kSelectStyle.marginBottom');
                    }
                    var marginBottom = parseFloat(scope.config.style.marginBottom.slice(0, -2));
                    var referenceHeight;
                    var referenceOffset;
                    if (containerHeight + containerOffset > windowHeight) {
                        referenceHeight = windowHeight;
                        referenceOffset = 0;
                    }
                    else {
                        referenceHeight = containerHeight;
                        referenceOffset = containerOffset;
                    }
                    maxHeight = referenceHeight - (contentOffset - referenceOffset) - marginBottom;
                    var minHeightFor3Elements = 93;
                    if (maxHeight < minHeightFor3Elements) {
                        maxHeight = minHeightFor3Elements;
                    }
                    return maxHeight;
                }
                scope.dropdown = {
                    onOpen: function ($event) {
                        if (scope.config.disabled) {
                            $event.prevent();
                            return;
                        }
                        if (hasBeenOpened === false) {
                            hasBeenOpened = true;
                        }
                        filterOptions();
                        $document.on('keyup', onEscPressed);
                        domDropDownMenu.style.visibility = 'hidden';
                        $timeout(function () {
                            adjustHeight();
                            domDropDownMenu.style.visibility = 'visible';
                            if (scope.config.filter.active) {
                                // use timeout to open dropdown first and then set the focus,
                                // otherwise focus won't be set because iElement is not visible
                                $timeout(function () {
                                    iElement[0].querySelector('.dropdown-menu input').focus();
                                });
                            }
                        });
                        jqWindow.on('resize', adjustHeight);
                        if (angular.isFunction(scope.config.dropdown.onOpen)) {
                            scope.config.dropdown.onOpen();
                        }
                    },
                    onClose: function () {
                        // important: set properties of filter.values to empty strings not to null,
                        // otherwise angular's filter won't work
                        scope.filter.values.label = '';
                        $timeout(function () {
                            resetHeight();
                        });
                        $document.off('keyup', onEscPressed);
                        jqWindow.off('resize', adjustHeight);
                        if (angular.isFunction(scope.config.dropdown.onClose)) {
                            scope.config.dropdown.onClose();
                        }
                    }
                };
                scope.$on('$destroy', function () {
                    $document.off('keyup', onEscPressed);
                    jqWindow.off('resize', adjustHeight);
                });
                scope.onKeyPressedOnDropDownToggle = function ($event) {
                    // enter or space
                    if ($event.keyCode === 13 || $event.keyCode === 32) {
                        $event.preventDefault();
                        $event.stopPropagation();
                        scope.dropdown.toggle();
                    }
                };
                function updateHeader() {
                    if (angular.isDefined(scope.config.header.text)) {
                        domHeaderText.textContent = scope.$parent.$eval(scope.config.header.text);
                    }
                    else {
                        var arr_1 = [];
                        internalOptions.forEach(function (option) { return collectActiveLabels(option, arr_1); });
                        domHeaderText.textContent = arr_1.join(', ');
                    }
                }
                /* * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * *
                 * filter
                 * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * */
                var initialLimitTo = 80;
                var increaseLimitTo = initialLimitTo * 0.5;
                function filterOptions() {
                    if (hasBeenOpened) {
                        // false as third parameter: use contains to compare
                        optionsFiltered = filterInternals(internalOptions, scope.filter.values.label ? scope.filter.values.label.toLowerCase() : '');
                        scope.options.visible = optionsFiltered.slice(0, initialLimitTo);
                    }
                }
                scope.showMoreOptions = function () {
                    scope.options.visible = optionsFiltered.slice(0, scope.options.visible.length + increaseLimitTo);
                };
                scope.onFilterValueChanged = function () {
                    filterOptions();
                };
                scope.clearFilter = function () {
                    scope.filter.values = {};
                    filterOptions();
                };
                scope.onKeyPressedInFilter = function ($event) {
                    // on enter
                    if ($event.keyCode === 13) {
                        $event.preventDefault();
                        $event.stopPropagation();
                        scope.selectFiltered();
                    }
                };
                /* * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * *
                 * buttons
                 * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * */
                scope.selectFiltered = function ($event) {
                    if (angular.isDefined($event)) {
                        $event.preventDefault();
                        $event.stopPropagation();
                    }
                    if (scope.config.children) {
                        setFilteredSelected(internalOptions);
                    }
                    else if (scope.config.multiple) {
                        setSelected(optionsFiltered, true);
                    }
                    else if (optionsFiltered.length === 1) {
                        scope.select(optionsFiltered[0]); // behaves like if the option was clicked using the mouse
                    }
                    setViewValue();
                };
                scope.deselectFiltered = function ($event) {
                    if (angular.isDefined($event)) {
                        $event.preventDefault();
                        $event.stopPropagation();
                    }
                    setSelected(optionsFiltered, false);
                    setViewValue();
                };
                scope.deselectAll = function ($event) {
                    if (angular.isDefined($event)) {
                        $event.preventDefault();
                        $event.stopPropagation();
                    }
                    setSelected(internalOptions, false);
                    setViewValue();
                };
                /* * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * *
                 * options
                 * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * */
                var updateOptions = (function () {
                    var deferred = $q.defer();
                    optionsAlreadyRead = deferred.promise;
                    return function updateOptions() {
                        var externalOptions = optionsExpParsed.collection(scope.$parent);
                        var viewValue = controller.$viewValue;
                        if (angular.isArray(externalOptions)) {
                            internalOptions = externalOptions2internalOptions(externalOptions, viewValue, w11kSelectHelper, optionsExpParsed, scope.config);
                            internalOptionsMap = {};
                            buildInternalOptionsMap(internalOptions, internalOptionsMap);
                            filterOptions();
                            if (ngModelAlreadyRead) {
                                updateNgModel();
                            }
                            deferred.resolve();
                        }
                    };
                })();
                // watch for changes of options collection made outside
                scope.$watchCollection(function externalOptionsWatch() {
                    return optionsExpParsed.collection(scope.$parent);
                }, function externalOptionsWatchAction(newVal) {
                    if (angular.isDefined(newVal)) {
                        updateOptions();
                    }
                });
                scope.select = function select(option) {
                    // runs only if hierarchy is flat and multiple false
                    if (scope.config.multiple) {
                        setViewValue();
                        return;
                    }
                    // disable all others:
                    setSelected(internalOptions, false);
                    option.state = OptionState.selected;
                    setViewValue();
                    scope.dropdown.close();
                };
                /* * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * *
                 * ngModel
                 * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * */
                function setViewValue() {
                    var selectedValues = internalOptions2externalModel(internalOptions, optionsExpParsed, w11kSelectConfig);
                    var newViewValue = selectedValues;
                    if (scope.config.useNullableModel && selectedValues.length === 0) {
                        newViewValue = null;
                    }
                    controller.$setViewValue(newViewValue);
                    updateHeader();
                }
                function updateNgModel() {
                    var value = internalOptions2externalModel(internalOptions, optionsExpParsed, w11kSelectConfig);
                    angular.forEach(controller.$parsers, function (parser) {
                        value = parser(value);
                    });
                    if (scope.config.useNullableModel && (typeof value === 'undefined' || (angular.isArray(value) && value.length === 0))) {
                        value = null;
                    }
                    ngModelSetter(scope.$parent, value);
                }
                function render() {
                    optionsAlreadyRead.then(function () {
                        ngModelAlreadyRead = true;
                        var viewValue = controller.$viewValue;
                        setSelected(internalOptions, false);
                        var i = viewValue.length;
                        while (i--) {
                            var trackingId = value2trackingId(viewValue[i], w11kSelectHelper, optionsExpParsed);
                            var option = internalOptionsMap[trackingId];
                            if (option) {
                                option.state = OptionState.selected;
                            }
                        }
                        updateHeader();
                    });
                }
                function external2internal(modelValue) {
                    var viewValue;
                    if (angular.isArray(modelValue)) {
                        viewValue = modelValue;
                    }
                    else if (angular.isDefined(modelValue) && !(scope.config.useNullableModel && modelValue === null)) {
                        viewValue = [modelValue];
                    }
                    else {
                        viewValue = [];
                    }
                    return viewValue;
                }
                function internal2external(viewValue) {
                    if (angular.isUndefined(viewValue)) {
                        return;
                    }
                    else if (scope.config.useNullableModel && viewValue === null) {
                        return null;
                    }
                    var modelValue;
                    if (scope.config.multiple || scope.config.forceArrayOutput) {
                        modelValue = viewValue;
                    }
                    else {
                        modelValue = viewValue[0];
                    }
                    return modelValue;
                }
                function validateRequired(value) {
                    if (scope.config.required) {
                        if (scope.config.multiple === true && (angular.isArray(value) && value.length === 0)) {
                            return false;
                        }
                        if (scope.config.multiple === false && scope.config.forceArrayOutput === true && (angular.isArray(value) && value.length === 0)) {
                            return false;
                        }
                        if (scope.config.multiple === false && value === undefined) {
                            return false;
                        }
                    }
                    return true;
                }
                function isEmpty() {
                    var value = controller.$viewValue;
                    return !(angular.isArray(value) && value.length > 0) || (scope.config.useNullableModel && value === null);
                }
                scope.isEmpty = isEmpty;
                controller.$isEmpty = isEmpty;
                controller.$render = render;
                controller.$formatters.push(external2internal);
                controller.$validators.required = validateRequired;
                controller.$parsers.push(internal2external);
            };
        }
    };
}
function checkConfig(config, setViewValue) {
    /**
     *  Currently there is a bug if multiple = false and required = true.
     *  Then the validator runs only once, before the config is present
     *  and returns a wrong validation state.
     *  might be fixed by calling updateNgModel() here
     */
    // throw error if multiple is false and childrenKey is present
    if (config.children && !config.multiple) {
        throw new Error('Multiple must be enabled when displaying hierarchically structure');
    }
    if (config.children) {
        setViewValue();
    }
}

var Result = (function () {
    function Result(length) {
        this.selected = 0;
        this.unselected = 0;
        this.childsSelected = 0;
        this.length = length;
    }
    return Result;
}());
function w11kSelectOptionDirective(w11kSelectConfig) {
    'ngInject';
    return {
        restrict: 'A',
        replace: false,
        templateUrl: w11kSelectConfig.common.templateUrlOptions,
        scope: {
            'options': '=',
            'parent': '=',
            'select': '&'
        },
        require: 'ngModel',
        controller: ["$scope", function ($scope) {
            if ($scope.$parent.childsMap) {
                $scope.$parent.addChild($scope, $scope.parent);
            }
            $scope.childsMap = {};
            $scope.upwardsClick = function (clickedOption, res) {
                var fatherOption = $scope.options.find(function (option) { return option.trackingId === clickedOption.parent; });
                if (res.selected === 0 && res.childsSelected === 0) {
                    setSelected$1(fatherOption, OptionState.unselected, $scope);
                }
                else if (res.selected === res.length) {
                    setSelected$1(fatherOption, OptionState.selected, $scope);
                }
                else {
                    setSelected$1(fatherOption, OptionState.childsSelected, $scope);
                }
                if ($scope.$parent.upwardsClick) {
                    var res_1 = calcRes($scope.options);
                    $scope.$parent.upwardsClick(fatherOption, res_1);
                }
            };
            $scope.addChild = function (childScope, father) {
                $scope.childsMap[father.trackingId] = childScope;
            };
            $scope.onOptionStateClick = function ($event, option) {
                switch (option.state) {
                    case OptionState.unselected:
                        setSelected$1(option, OptionState.selected, $scope);
                        break;
                    case OptionState.selected:
                        setSelected$1(option, OptionState.unselected, $scope);
                        break;
                    case OptionState.childsSelected:
                        setSelected$1(option, OptionState.selected, $scope);
                        break;
                }
                // upwards Click
                if ($scope.$parent.upwardsClick) {
                    var res = calcRes($scope.options);
                    $scope.$parent.upwardsClick(option, res);
                }
                $scope.childsMap[option.trackingId].downWardstoggleAll(option.state);
            };
            $scope.downWardstoggleAll = function (toSetState) {
                $scope.options = toggleDownWards($scope.options, toSetState, $scope);
            };
            $scope.filterSearchResultsInView = function (item) {
                return item.isSearchResultOrParent;
            };
        }]
    };
}
function toggleDownWards(options, toSetState, $scope) {
    return options.map(function (option) {
        option.children = toggleDownWards(option.children, toSetState, $scope);
        setSelected$1(option, toSetState, $scope);
        return option;
    });
}
function calcRes(options) {
    return options.reduce(function (prev, next) {
        if (next.state === OptionState.selected) {
            prev.selected++;
        }
        if (next.state === OptionState.unselected) {
            prev.unselected++;
        }
        if (next.state === OptionState.childsSelected) {
            prev.childsSelected++;
        }
        return prev;
    }, new Result(options.length));
}
function setSelected$1(option, optionState, $scope) {
    option.state = optionState;
    $scope.select({ option: option });
}

var W11KSelectCheckbox = (function () {
    function W11KSelectCheckbox() {
    }
    W11KSelectCheckbox.prototype.getClass = function (state) {
        return OptionState[state];
    };
    return W11KSelectCheckbox;
}());
function w11kSelectCheckboxDirective() {
    return {
        scope: {
            'state': '=',
        },
        bindToController: true,
        controllerAs: '$ctrl',
        template: "<a class=\"w11k-checkbox\" ng-class=\"$ctrl.getClass($ctrl.state)\"></a>",
        restrict: 'E',
        controller: W11KSelectCheckbox
    };
}

function w11kSelectInfiniteScroll($timeout) {
    'ngInject';
    return {
        link: function (scope, element$$1, attrs) {
            var scrollDistance = 0;
            var scrollEnabled = true;
            var checkImmediatelyWhenEnabled = false;
            var onDomScrollHandler = function () {
                onScrollHandler(true);
            };
            var scrollContainer = element$$1[0];
            if (scrollContainer.children.length !== 1) {
                throw new Error('scroll container has to have exactly one child!');
            }
            var content = scrollContainer.children[0];
            var onScrollHandler = function (apply) {
                var distanceToBottom = content.clientHeight - scrollContainer.scrollTop;
                var shouldScroll = distanceToBottom <= scrollContainer.clientHeight * (scrollDistance + 1);
                if (shouldScroll && scrollEnabled) {
                    if (apply) {
                        scope.$apply(function () {
                            scope.$eval(attrs.w11kSelectInfiniteScroll);
                        });
                    }
                    else {
                        scope.$eval(attrs.w11kSelectInfiniteScroll);
                    }
                }
                else if (shouldScroll) {
                    checkImmediatelyWhenEnabled = true;
                }
            };
            attrs.$observe('w11kSelectInfiniteScrollDistance', function (value) {
                scrollDistance = parseFloat(value);
            });
            attrs.$observe('w11kSelectInfiniteScrollDisabled', function (value) {
                scrollEnabled = !value;
                if (scrollEnabled && checkImmediatelyWhenEnabled) {
                    checkImmediatelyWhenEnabled = false;
                    onScrollHandler();
                }
            });
            element$$1.on('scroll', onDomScrollHandler);
            scope.$on('$destroy', function () {
                element$$1.off('scroll', onDomScrollHandler);
            });
            return $timeout(function () {
                if (attrs.w11kSelectInfiniteScrollImmediateCheck) {
                    if (scope.$eval(attrs.w11kSelectInfiniteScrollImmediateCheck)) {
                        onScrollHandler();
                    }
                }
            });
        }
    };
}

function keyListener() {
    return function (scope, elm, attrs) {
        // prevent scroll on space click
        elm.bind('keydown', function (event) {
            if (event.keyCode === 32) {
                event.preventDefault();
            }
        });
        // trigger click on spacer || enter
        elm.bind('keyup', function (event) {
            if (event.keyCode === 32 || event.keyCode === 13) {
                scope.$apply(attrs.keyListener);
            }
        });
    };
}

/** @internal */
var module$2 = angular.module('w11k.select', [
    'w11k.dropdownToggle',
    'w11k.select.template'
]);
module$2
    .constant('w11kSelectConfig', new Config())
    .directive('w11kSelectInfiniteScroll', w11kSelectInfiniteScroll)
    .service('w11kSelectHelper', W11KSelectHelper)
    .directive('w11kSelect', w11kSelect)
    .directive('w11kSelectOption', w11kSelectOptionDirective)
    .directive('w11kSelectCheckbox', w11kSelectCheckboxDirective)
    .directive('keyListener', keyListener);

exports.module = module$2;
exports.Config = Config;

Object.defineProperty(exports, '__esModule', { value: true });

})));
//# sourceMappingURL=w11k-select.js.map
