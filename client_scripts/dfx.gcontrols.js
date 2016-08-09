var dfxGControls = angular.module('dfxGControls',['ngMaterial', 'ngMdIcons', 'ngMessages', 'ngSanitize', 'ngAnimate', 'nvd3', 'ngQuill', 'jkAngularCarousel', 'ui.knob']);

dfxGControls.factory('dfxGCUtil', [ function() {

    var gc_util_services = {};

    gc_util_services.renderHtml = function( el, attrs ) {
        return '/gcontrols/web/image.html';
    };

    return gc_util_services;
}]);

dfxGControls.directive('dfxGcDesign', function() {
    return {
        restrict: 'A',
        controller: function($scope, $element, $attrs) {
            var element_id = $element.attr('id');
            var parent_id = $('#'+element_id).parent().attr('id');

            if ($attrs.dfxGcRendererContent==null) {
                $element.addClass( 'dfx-ve-gc-handle-container' );
                $element.bind( 'mouseenter', function(event) {
                    var rect = $element[0].getBoundingClientRect();
                    $('.dfx_visual_editor_highlighted_box').css('left', rect.left);
                    $('.dfx_visual_editor_highlighted_box').css('top', rect.top-121);
                    $('.dfx_visual_editor_highlighted_box').width(rect.width);
                    $('.dfx_visual_editor_highlighted_box').height(rect.height);
                    $('.dfx_visual_editor_highlighted_box').css('display', 'block');
                });

                $element.bind( 'mouseout', function(event) {
                    $('.dfx_visual_editor_highlighted_box').css('display', 'none');
                });

                $element.bind( 'click', function(event) {
                    event.stopImmediatePropagation();
                    var rect = $element[0].getBoundingClientRect();
                    $('.dfx-ve-gc-handle-selected').css('display','none');
                    $('#'+element_id+'_handle_select').css('display','block');
                    $('.dfx_visual_editor_highlighted_box').css('display', 'none');
                    /*$('.dfx_visual_editor_selected_box').css('left', rect.left);
                     $('.dfx_visual_editor_selected_box').css('top', rect.top-121);
                     $('.dfx_visual_editor_selected_box').width(rect.width);
                     $('.dfx_visual_editor_selected_box').height(rect.height);
                     $('.dfx_visual_editor_selected_box').css('display', 'block');*/

                    $scope.loadPropertyPanel(element_id);

                });
            }
            $scope.initContainers();
        }
    }
});

dfxGControls.directive('dfxGcWebBase', ['$rootScope', '$http', '$compile', '$injector', '$mdToast', '$q', function($rootScope, $http, $compile, $injector, $mdToast, $q) {
    return {
        controller: function($element) {
            var base = this;

            var storeGcTemplate = function (gc_type, gc_template) {
                sessionStorage.setItem('dfx_' + gc_type, JSON.stringify(gc_template));
            };

            var mergeArrayTypeAttribute = function (default_array_attribute, updated_array_attribute) {
                for (var i = 0; i < updated_array_attribute.length; i++) {
                    if (i > 0) {// default_attributes array contains only one, first array element, so, clone it first
                        default_array_attribute.push(angular.copy(default_array_attribute[0]));
                    }
                    mergeWithOverriddenAttributes(default_array_attribute[i], updated_array_attribute[i]);
                }
            };
            var mergeWithOverriddenAttributes = function (default_attributes, updated_attributes) {
                for (var updated_attribute in updated_attributes) {
                    if (updated_attributes.hasOwnProperty(updated_attribute)) {
                        if (updated_attribute != 'value' && updated_attribute != 'status' &&
                            (default_attributes[updated_attribute] || default_attributes[updated_attribute] === ''))
                        {

                            if ( Array.isArray(updated_attributes[updated_attribute]) ) {
                                //mergeArrayTypeAttribute(default_attributes[updated_attribute], updated_attributes[updated_attribute]);
                                default_attributes[updated_attribute] = updated_attributes[updated_attribute];// this is an array, without 'value'
                            } else {
                                if (updated_attributes[updated_attribute] !== null && typeof updated_attributes[updated_attribute] === 'object') {
                                    mergeWithOverriddenAttributes(default_attributes[updated_attribute], updated_attributes[updated_attribute]);
                                }

                                if (updated_attribute) {
                                    if (updated_attributes[updated_attribute] !== null && typeof updated_attributes[updated_attribute] === 'object') {
                                        default_attributes[updated_attribute].status = 'overridden';
                                        default_attributes[updated_attribute].value  = updated_attributes[updated_attribute].value;
                                    } else {
                                        default_attributes[updated_attribute] = updated_attributes[updated_attribute];//attribute is not object, ex: style = ""
                                    }
                                }
                            }
                        }
                    }
                }
            };

            this.callViewControllerFunction = function( view_id, function_name ) {
                var view_instance = document.querySelector('#'+view_id);
                var view_scope = angular.element(view_instance).scope();
                view_scope.$eval(function_name + '()');
            };

            this.evaluateViewExpression= function( view_id, expression ) {
                var view_instance = document.querySelector('#'+view_id);
                var view_scope = angular.element(view_instance).scope();
                return view_scope.$eval(expression);
            };

            this.init = function(scope, element, component, attrs, type) {
                if (!angular.isDefined(attrs.dfxGcEdit)) {
                    return base.initAttributes(scope, element, component, attrs, type);
                } else {
                    return base.initExistingComponent(scope, element, component, attrs);
                }
            };

            this.initAttributes = function(scope, element, component, attrs, type) {
                var app_body = angular.element(document.querySelector('body'));
                var app_scope = angular.element(app_body).scope();
                return app_scope.getGCDefaultAttributes( type ).then( function(default_attributes) {
                    var isExistingAttributes = (component.attributes==null) ? false : true;
                    var component_default_attributes = angular.copy(default_attributes);

                    storeGcTemplate(type, default_attributes);

                    //if (isExistingAttributes) {
                    //    for (var attribute_name in component.attributes) {
                    //        component_default_attributes[attribute_name] = component.attributes[attribute_name];
                    //        component_default_attributes[attribute_name].status = 'overridden';
                    //    }
                    //}
                    if (isExistingAttributes) {
                        mergeWithOverriddenAttributes(component_default_attributes, component.attributes);
                    }
                    component.attributes = component_default_attributes;

                    if (isExistingAttributes && component.attributes.children!=null) {
                        component.children =  component.attributes.children.slice(0);
                        delete component.attributes.children;
                        base.initChildIDs(component.children);
                    } else {
                        if (component.children==null) {
                            component.children =  [];
                        }
                    }
                    if (!isExistingAttributes) {
                        scope.$parent.setComponent(component);
                    }
                    $rootScope.$emit(attrs.id + '_attributes_loaded', component.attributes);
                    base.initExistingComponent(scope, element, component, attrs);
                });
            };

            this.initChildIDs = function(child_elements) {
                var idx=0;
                for (idx=0; idx<child_elements.length; idx++) {
                    var uuid = Math.floor(Math.random() * 100000);
                    child_elements[idx].id = uuid;
                    if (child_elements[idx].children.length>0) {
                        base.initChildIDs(child_elements[idx].children);
                    }
                }
            };

            this.initExistingComponent = function(scope, element, component, attrs) {
                scope.component_id = component.id;
                scope.attributes = component.attributes;
                scope.children = {};
                scope.view_id = attrs.viewId;
                scope.parent_id = attrs.gcParent;
                scope.rendering_children = {};

                if (!angular.isDefined(attrs.dfxGcEdit)) {
                    angular.element(document).ready(function() {
                        if (angular.isDefined(attrs.dfxGcDesign)) {
                            var handle = '<div id="' + scope.component_id + '_handle" class="dfx-ve-gc-handle"><i class="fa fa-arrows"></i></div>';
                            var handle_remove = '<a id="' + scope.component_id + '_handle_remove" href="#" onclick="DfxVisualBuilder.removeComponent(\'' + scope.component_id +'\')" class="dfx-ve-gc-handle-remove"><i class="fa fa-trash"></i></a>';
                            var handle_duplicate = '<a id="' + scope.component_id + '_handle_duplicate" href="#" onclick="DfxVisualBuilder.duplicateComponent(\'' + scope.component_id +'\', \'' + scope.view_card_selected +'\')" class="dfx-ve-gc-handle-duplicate"><i class="fa fa-files-o"></i></a>';
                            //var handle_select = '<div id="' + scope.component_id + '_handle_select" class="dfx-ve-gc-handle-selected"><i class="fa fa-wrench"></i></div>';
                            //$("#"+scope.component_id).prepend(handle_select);
                            $("#"+scope.component_id).prepend(handle_remove);
                            $("#"+scope.component_id).prepend(handle);
                            $("#"+scope.component_id).prepend(handle_duplicate);
                        }
                        $rootScope.$on(scope.component_id + '_child_rendered', function(event, child_id) {
                            delete scope.rendering_children[child_id];
                            var count = 0;
                            for (key in scope.rendering_children) {
                                count++;
                            }
                            if (count==0) {
                                $rootScope.$emit(scope.component_id + '_rendering_completed');
                            }
                        });
                        if (angular.isDefined(attrs.dfxGcDesign)) {
                            if (component.children.length >0) {
                                for (var i=0; i<component.children.length; i++) {
                                    scope.rendering_children[component.children[i].id] = { 'rendered': false };
                                }
                                scope.$parent.addComponents(component.children, component, null, scope.component_id, attrs.viewId);
                            }
                        } else {
                            if (scope.parent_id!=null && scope.parent_id!='') {
                                $rootScope.$emit(scope.parent_id + '_child_rendered', scope.component_id);
                            }
                        }
                    });
                }
                if (!angular.isDefined(attrs.dfxGcDesign) && !angular.isDefined(attrs.dfxGcEdit)) {
                    // adding children to their respective container
                    for (var idx_child=0; idx_child<component.children.length; idx_child++) {
                        if (scope.children[component.children[idx_child].container]==null) {
                            scope.children[component.children[idx_child].container] = [];
                        }
                        scope.children[component.children[idx_child].container].push(component.children[idx_child]);
                    }
                    if (attrs.dfxGcRendererContent!=null) {
                        scope.$parent_scope = scope.$parent;
                    } else {
                        scope.$parent_scope = angular.element(document.getElementById(scope.view_id)).scope().$parent;
                    }
                    if (component.attributes.ext_directives!=null) {
                        for (var idx=0; idx<component.attributes.ext_directives.length; idx++) {
                            var ext_directive = component.attributes.ext_directives[idx];
                            var directive_link = $injector.get(ext_directive.directive+'Directive')[0];
                            attrs[ext_directive.directive] = ext_directive.value;
                            directive_link.link(scope, element, attrs);
                        }
                    }
                }

                return $q.when(component.id);
            };

            this.bindScopeVariable = function( scope, scope_variable_name ) {
                scope.$watch( scope_variable_name, function(newValue, oldValue) {
                    scope.$parent_scope[scope_variable_name] = newValue;
                });
                scope.$parent_scope.$watch( scope_variable_name, function(newValue, oldValue) {
                    scope[scope_variable_name] = newValue;
                });
            };
        }
    }
}]);

dfxGControls.directive('dfxGcProperty', [function() {
    return {
        restrict: 'A',
        controller: function($scope, $element, $attrs) {
            var component = $scope.$parent.gc_selected;
            if (component.attributes[$attrs.dfxGcProperty]['protected']) {
                $element.css('display', 'none');
            }
        }
    };
}]);

dfxGControls.directive('dfxGcWebPanel', ['$timeout', '$compile', function($timeout, $compile) {
    return {
        restrict: 'A',
        require: '^dfxGcWebBase',
        transclude : true,
        scope: true,
        templateUrl: function( el, attrs ) {
            if (angular.isDefined(attrs.dfxGcEdit)) {
                return '/gcontrols/web/panel_edit.html';
            } else if (angular.isDefined(attrs.dfxGcDesign)) {
                return '/gcontrols/web/panel_design.html';
            } else {
                return '/gcontrols/web/panel.html';
            }
        },
        link: function(scope, element, attrs, basectrl) {
            var component = scope.getComponent(element);
            basectrl.init(scope, element, component, attrs, 'panel').then(function(){
                scope.attributes.layoutType = { "value": "panel" };
                scope.attributes.isMainPanel = { "value": false };
                scope.attributes.initialized = { "value": true };
                scope.attributes.toolbar.leftMenu.equalButtonSize = { "value": false };
                scope.attributes.toolbar.leftMenu.initialClick = { "value": false };
                scope.attributes.toolbar.leftMenu.dynamicPresent = { "value": false };
                scope.attributes.toolbar.rightMenu.equalButtonSize = { "value": false };
                scope.attributes.toolbar.rightMenu.initialClick = { "value": false };
                scope.attributes.toolbar.rightMenu.dynamicPresent = { "value": false };
                if(scope.attributes.hasOwnProperty('collapsible')){delete scope.attributes.collapsible;}
                if(scope.attributes.toolbar.leftMenu.hasOwnProperty('iconBarClass')){delete scope.attributes.toolbar.leftMenu.iconBarClass;}
                if(scope.attributes.toolbar.rightMenu.hasOwnProperty('iconBarClass')){delete scope.attributes.toolbar.rightMenu.iconBarClass;}

                var parentId = ($('#' + scope.component_id).parent()).attr('id');
                if(parentId === 'dfx_visual_editor_workspace_' + scope.view_card_selected){
                    scope.attributes.isMainPanel.value = true;
                }
                if(scope.attributes.isMainPanel.value){
                    $timeout(function(){
                        $('#' + scope.component_id + '_handle_duplicate').remove();
                    },0);
                }
                scope.moveUpRow = function(index){
                    if(index>0){
                        /*var curCols = $('#' + scope.component_id + '_layout_0' + '_row_' + index).children() ;
                        var nextCols = $('#' + scope.component_id + '_layout_0' + '_row_' + (index-1)).children() ;
                        var curColsContent = [] ;
                        var nextColsContent = [] ;
                        for(var i =0; i < curCols.length; i++){
                            curColsContent.push($(curCols[i]).html()) ;
                        }
                        for(var i =0; i < nextCols.length; i++){
                            nextColsContent.push($(nextCols[i]).html()) ;
                        }*/

                        scope.attributes.layout.rows.splice(index - 1, 2, scope.attributes.layout.rows[index], scope.attributes.layout.rows[index-1]) ;
                        scope.swapContainerUp(scope.component_id, index, 0);

                        /*$timeout(function(){
                            var movedDownCols = $('#' + scope.component_id + '_layout_0' + '_row_' + (index - 1)).children() ;
                            for(var j =0; j < movedDownCols.length; j++){
                                $(movedDownCols[j]).html(curColsContent[j]) ;
                                $compile($(movedDownCols[j]).contents())(scope);
                            }
                            var movedUpCols =  $('#' + scope.component_id + '_layout_0' + '_row_' + (index)).children() ;
                            for(var k =0; k < movedUpCols.length; k++){
                                $(movedUpCols[k]).html(nextColsContent[k]) ;
                                $compile($(movedUpCols[k]).contents())(scope);
                            }
                        },0);*/
                    }
                };

                scope.moveLeftCol = function(rowIndex, index){
                    if(index > 0){
                        /*var curCol = $('#' + scope.component_id + '_layout_0' + '_row_' + rowIndex + '_column_' + index) ;
                        var leftCol = $('#' + scope.component_id + '_layout_0' + '_row_' + rowIndex + '_column_' + (index-1)) ;
                        var curColHtml = curCol.html() ;
                        var leftColHtml = leftCol.html() ;*/

                        scope.attributes.layout.rows[rowIndex].cols.splice(index-1, 2, scope.attributes.layout.rows[rowIndex].cols[index], scope.attributes.layout.rows[rowIndex].cols[index-1]);
                        scope.swapContainerLeft(scope.component_id, index, rowIndex, 0);

                        /*$timeout(function(){
                            curCol.html(leftColHtml);
                            $compile(curCol.contents())(scope);
                            leftCol.html(curColHtml);
                            $compile(leftCol.contents())(scope);
                        },0);*/
                    }
                };

                scope.moveDownRow = function(index){
                    if(index < scope.attributes.layout.rows.length-1){
                        /*var curCols = $('#' + scope.component_id + '_layout_0' + '_row_' + index).children() ;
                        var nextCols = $('#' + scope.component_id + '_layout_0' + '_row_' + (index+1)).children() ;
                        var curColsContent = [] ;
                        var nextColsContent = [] ;
                        for(var i =0; i < curCols.length; i++){
                            curColsContent.push($(curCols[i]).html()) ;
                        }
                        for(var i =0; i < nextCols.length; i++){
                            nextColsContent.push($(nextCols[i]).html()) ;
                        }*/

                        scope.attributes.layout.rows.splice(index, 2, scope.attributes.layout.rows[index+1], scope.attributes.layout.rows[index]) ;
                        scope.swapContainerDown(scope.component_id, index, 0);

                        /*$timeout(function(){
                            var movedDownCols = $('#' + scope.component_id + '_layout_0' + '_row_' + (index + 1)).children() ;
                            for(var j =0; j < movedDownCols.length; j++){
                                $(movedDownCols[j]).html(curColsContent[j]) ;
                                $compile($(movedDownCols[j]).contents())(scope);
                            }
                            var movedUpCols =  $('#' + scope.component_id + '_layout_0' + '_row_' + (index)).children() ;
                            for(var k =0; k < movedUpCols.length; k++){
                                $(movedUpCols[k]).html(nextColsContent[k]) ;
                                $compile($(movedUpCols[k]).contents())(scope);
                            }
                        },0);*/
                    }
                };

                scope.moveRightCol = function(rowIndex, index){
                    if(index < scope.attributes.layout.rows[rowIndex].cols.length-1){
                        /*var curCol = $('#' + scope.component_id + '_layout_0' + '_row_' + rowIndex + '_column_' + index) ;
                        var rightCol = $('#' + scope.component_id + '_layout_0' + '_row_' + rowIndex + '_column_' + (index+1)) ;
                        var curColHtml = curCol.html() ;
                        var rightColHtml = rightCol.html() ;*/

                        scope.attributes.layout.rows[rowIndex].cols.splice(index, 2, scope.attributes.layout.rows[rowIndex].cols[index+1], scope.attributes.layout.rows[rowIndex].cols[index]);
                        scope.swapContainerRight(scope.component_id, index, rowIndex, 0);

                        /*$timeout(function(){
                            curCol.html(rightColHtml);
                            $compile(curCol.contents())(scope);
                            rightCol.html(curColHtml);
                            $compile(rightCol.contents())(scope);
                        },0);*/
                    }
                };

                scope.changeWidth = function(){
                    if ( !angular.isDefined(attrs.dfxGcDesign) && !angular.isDefined(attrs.dfxGcEdit) ) {
                        if ( !scope.attributes.repeat_title.value ) {
                            $('#' + scope.component_id).css('width', scope.attributes.flex.value + '%');
                        }
                    } else {
                        $('#' + scope.component_id).css('width', scope.attributes.flex.value + '%');
                    }
                };
                if (!angular.isDefined(attrs.dfxGcEdit)) {
                    scope.changeWidth();
                }
                scope.collapsePanelBody = function(isCollapsed, index) {
                    if (!angular.isDefined(attrs.dfxGcDesign) && !angular.isDefined(attrs.dfxGcEdit)) {
                        if ( scope.attributes.repeat_title.value ) {
                            basectrl.bindScopeVariable( scope, component.attributes.repeat_in.value );
                        } else {
                            basectrl.bindScopeVariable( scope, component.attributes.toolbar.collapsed.value );
                        }
                        if ( scope.attributes.toolbar.collapsed.value == 'true' || scope.attributes.toolbar.collapsed.value == 'false' ) {
                            if ( isCollapsed ) {
                                scope.attributes.toolbar.collapsed.value = 'false';
                            } else {
                                scope.attributes.toolbar.collapsed.value = 'true';
                            }
                        } else {
                            if ( scope.attributes.repeat_title.value ) {
                                var collapsedEl = scope.attributes.toolbar.collapsed.value.replace("$dfx_item.", "");
                                if ( isCollapsed ) {
                                    scope[scope.attributes.repeat_in.value][index][collapsedEl] = false;
                                } else {
                                    scope[scope.attributes.repeat_in.value][index][collapsedEl] = true;
                                }
                            } else {
                                if ( isCollapsed ) {
                                    scope.$parent_scope[scope.attributes.toolbar.collapsed.value] = false;
                                } else {
                                    scope.$parent_scope[scope.attributes.toolbar.collapsed.value] = true;
                                }
                            }
                        }
                    } else {
                        if ( scope.attributes.toolbar.collapsed.value == 'false' ) {
                            scope.attributes.toolbar.collapsed.designValue = true;
                            scope.attributes.toolbar.collapsed.value = 'true';
                        } else if ( scope.attributes.toolbar.collapsed.value == 'true' ) {
                            scope.attributes.toolbar.collapsed.designValue = false;
                            scope.attributes.toolbar.collapsed.value = 'false';
                        } else {
                            if ( !scope.attributes.toolbar.collapsed.designValue || scope.attributes.toolbar.collapsed.designValue == false ) {
                                scope.attributes.toolbar.collapsed.designValue = true;
                            } else {
                                scope.attributes.toolbar.collapsed.designValue = false;
                            }
                        }
                    }
                }

                scope.checkPanelBody = function() {
                    if ( scope.attributes.toolbar.collapsed.value == 'true' ) {
                        scope.attributes.toolbar.collapsed.designValue = true;
                    } else {
                        scope.attributes.toolbar.collapsed.designValue = false;
                    }
                }

                scope.checkCollapses = function() {
                    if ( !scope.attributes.toolbar.hasOwnProperty('collapsed') ) {
                        var addCollapsed = { "collapsed": { "value": "false" }};
                        scope.attributes.toolbar.collapsed = addCollapsed.collapsed;
                    }
                    if ( !scope.attributes.toolbar.hasOwnProperty('collapsible') ) {
                        var addCollapsible = { "collapsible": { "value": "false" }};
                        scope.attributes.toolbar.collapsible = addCollapsible.collapsible;
                    }
                    if ( !scope.attributes.hasOwnProperty('repeat_title') ) {
                        var addRepeatTitle = { "repeat_title": { "value": false }};
                        scope.attributes.repeat_title = addRepeatTitle.repeat_title;
                    }
                }

                scope.checkCollapses();

                if (angular.isDefined(attrs.dfxGcDesign)) {
                    $timeout(function(){
                        scope.checkPanelBody();
                    }, 0);
                }
            });
        }
    }
}]);

dfxGControls.directive('dfxGcWebInput', ['$timeout', function($timeout) {
    return {
        restrict: 'A',
        require: '^dfxGcWebBase',
        scope: true,
        templateUrl: function( el, attrs ) {
            if (angular.isDefined(attrs.dfxGcEdit)) {
                return '/gcontrols/web/input_edit.html';
            } else if (angular.isDefined(attrs.dfxGcDesign)) {
                return '/gcontrols/web/input_design.html';
            } else {
                return '/gcontrols/web/input.html';
            }
        },
        link: function(scope, element, attrs, basectrl) {
            var component = scope.$parent.getComponent(element);
            scope.$gcscope = scope;
            basectrl.init(scope, element, component, attrs, 'input').then(function(){
                scope.attributes.binding.status = 'overridden';
                if ( !scope.attributes.hasOwnProperty('flex') ) { scope.attributes.flex = { "value": 50 }; }
                scope.attributes.flex.status = "overridden";
                scope.attributes.minlength.value = parseInt(scope.attributes.minlength.value);
                scope.attributes.maxlength.value = parseInt(scope.attributes.maxlength.value);
                scope.attributes.minNumber.value = parseInt(scope.attributes.minNumber.value);
                scope.attributes.maxNumber.value = parseInt(scope.attributes.maxNumber.value);
                scope.$watch("$gcscope[attributes.binding.value]", function(newValue){
                    if (!angular.isDefined(attrs.dfxGcDesign) && !angular.isDefined(attrs.dfxGcEdit)) {
                        if(scope.attributes.binding.value !== "" && !scope.attributes.binding.repeatable){
                            var bindingString = scope.attributes.binding.value;
                            eval("scope." + bindingString + "= newValue ;");
                        }
                    }
                });
                if (!angular.isDefined(attrs.dfxGcDesign) && !angular.isDefined(attrs.dfxGcEdit)) {
                    if(scope.attributes.binding.value.substring(0, 6) === '$item.' || scope.attributes.binding.value.substring(0, 6) === '$item['){
                        scope.attributes.binding.repeatable = true ;
                        if(scope.attributes.binding.value.charAt(5) === '.'){
                            scope.attributes.binding.$itemValue = scope.attributes.binding.value.substr(6);
                        }else{
                            scope.attributes.binding.$itemValue = scope.attributes.binding.value.substr(6, scope.attributes.binding.value.length - 7);
                        }

                    }else{
                        basectrl.bindScopeVariable( scope, component.attributes.binding.value );
                    }
                }
                if ( typeof scope.attributes.icon === 'string' ) {
                    var tempIcon = scope.attributes.icon;
                    scope.attributes.icon = {
                        "value": tempIcon,
                        "type": scope.attributes.hasOwnProperty('iconType') ? scope.attributes.iconType : 'fa-icon'
                    }
                }
                if ( !scope.attributes.icon.hasOwnProperty('size') ) { scope.attributes.icon.size = 21; }
                scope.ifShowIconTypes = function( icon ) {
                    var regexp = /(^\')(.*)(\'$)/gm, filtered = regexp.exec( icon );
                    if ( icon && ( icon.indexOf('+') >= 0 ) ) { filtered = false; }
                    if ( icon === '' ) { filtered = true; }
                    if ( icon.indexOf("'") === 0 && icon.indexOf('+') === -1 && icon.charAt(icon.length-1) === "'" ) {
                        icon.indexOf("'fa-") === 0 ? scope.attributes.icon.type = 'fa-icon' : scope.attributes.icon.type = 'svg-icon';
                    }
                    scope.showIconTypes = filtered ? false : true;
                }
                scope.ifShowIconTypes(scope.attributes.icon.value);
                scope.changeWidth = function(){
                    $('#' + scope.component_id).css('width', scope.attributes.flex.value + '%');
                };
                if (!angular.isDefined(attrs.dfxGcEdit)) {
                    scope.changeWidth();
                }
            });
        }
    }
}]);

dfxGControls.directive('dfxGcWebTextarea', ['$timeout', function($timeout) {
    return {
        restrict: 'A',
        require: '^dfxGcWebBase',
        scope: true,
        templateUrl: function( el, attrs ) {
            if (angular.isDefined(attrs.dfxGcEdit)) {
                return '/gcontrols/web/textarea_edit.html';
            } else if (angular.isDefined(attrs.dfxGcDesign)) {
                return '/gcontrols/web/textarea_design.html';
            } else {
                return '/gcontrols/web/textarea.html';
            }
        },
        link: function(scope, element, attrs, basectrl) {
            var component = scope.$parent.getComponent(element);
            scope.$gcscope = scope;
            basectrl.init(scope, element, component, attrs, 'textarea').then(function(){
                if ( !scope.attributes.hasOwnProperty('flex') ) { scope.attributes.flex = { "value": 50 }; }
                scope.attributes.flex.status = "overridden" ;
                scope.attributes.icon.status = "overridden" ;
                scope.$watch('attributes.rowsNumber.value', function(newValue){
                    scope.attributes.rowsNumber.value = parseInt(newValue);
                });
                scope.$watch("$gcscope[attributes.binding.value]", function(newValue){
                    if (!angular.isDefined(attrs.dfxGcDesign) && !angular.isDefined(attrs.dfxGcEdit)) {
                        if(scope.attributes.binding.value !== ""){
                            var bindingString = scope.attributes.binding.value;
                            eval("scope." + bindingString + "= newValue ;");
                        }
                    }
                });
                if (!angular.isDefined(attrs.dfxGcDesign) && !angular.isDefined(attrs.dfxGcEdit)) {
                    basectrl.bindScopeVariable( scope, component.attributes.binding.value );
                }
                if ( typeof scope.attributes.icon === 'string' ) {
                    var tempIcon = scope.attributes.icon;
                    scope.attributes.icon = {
                        "value": tempIcon,
                        "type": scope.attributes.hasOwnProperty('iconType') ? scope.attributes.iconType : 'fa-icon'
                    }
                }
                if ( !scope.attributes.icon.hasOwnProperty('size') ) { scope.attributes.icon.size = 21; }
                scope.ifShowIconTypes = function( icon ) {
                    var regexp = /(^\')(.*)(\'$)/gm, filtered = regexp.exec( icon );
                    if ( icon && ( icon.indexOf('+') >= 0 ) ) { filtered = false; }
                    if ( icon === '' ) { filtered = true; }
                    if ( icon.indexOf("'") === 0 && icon.indexOf('+') === -1 && icon.charAt(icon.length-1) === "'" ) {
                        icon.indexOf("'fa-") === 0 ? scope.attributes.icon.type = 'fa-icon' : scope.attributes.icon.type = 'svg-icon';
                    }
                    scope.showIconTypes = filtered ? false : true;
                }
                scope.ifShowIconTypes(scope.attributes.icon.value);
                scope.changeWidth = function(){
                    $('#' + scope.component_id).css('width', scope.attributes.flex.value + '%');
                };
                if (!angular.isDefined(attrs.dfxGcEdit)) {
                    scope.changeWidth();
                }
            });
        }
    }
}]);

dfxGControls.directive('dfxGcWebStatictext', ['$timeout', function($timeout) {
    return {
        restrict: 'A',
        require: '^dfxGcWebBase',
        scope: true,
        templateUrl: function( el, attrs ) {
            if (angular.isDefined(attrs.dfxGcEdit)) {
                return '/gcontrols/web/statictext_edit.html';
            } else if (angular.isDefined(attrs.dfxGcDesign)) {
                return '/gcontrols/web/statictext_design.html';
            } else {
                return '/gcontrols/web/statictext.html';
            }
        },
        link: {
            pre: function(scope, element, attrs, basectrl) {
                var component = scope.$parent.getComponent(element);
                scope.component_id = component.id;
                scope.attributes = null;
                basectrl.init(scope, element, component, attrs, 'statictext').then(function(){
                    $timeout(function(){
                        $('#' + scope.component_id + '_handle').css('margin-left', '-10px');
                        $('#' + scope.component_id + '_handle').css('margin-top', '-12px');

                        $('#' + scope.component_id + '_handle_duplicate').css('margin-right', '-10px');
                        $('#' + scope.component_id + '_handle_duplicate').css('margin-top', '-12px');

                        $('#' + scope.component_id + '_handle_remove').css('margin-right', '-10px');
                        $('#' + scope.component_id + '_handle_remove').css('margin-bottom', '-12px');
                    },0);
                });
            }
        }
    }
}]);

dfxGControls.directive('dfxGcWebChips', ['$timeout', function($timeout) {
    return {
        restrict: 'A',
        require: '^dfxGcWebBase',
        scope: true,
        templateUrl: function( el, attrs ) {
            if (angular.isDefined(attrs.dfxGcEdit)) {
                return '/gcontrols/web/chips_edit.html';
            } else if (angular.isDefined(attrs.dfxGcDesign)) {
                return '/gcontrols/web/chips_design.html';
            } else {
                return '/gcontrols/web/chips.html';
            }
        },
        link: function(scope, element, attrs, basectrl) {
            var component = scope.$parent.getComponent(element);
            scope.$gcscope = scope;
            basectrl.init(scope, element, component, attrs, 'chips').then(function(){
                if(!scope.attributes.hasOwnProperty('isBindEmpty')){scope.attributes.isBindEmpty = { "value": true };}
                if(scope.attributes.hasOwnProperty('property1')){delete scope.attributes.property1;}
                if(scope.attributes.hasOwnProperty('property2')){delete scope.attributes.property2;}
                if(scope.attributes.hasOwnProperty('customItems')){delete scope.attributes.customItems;}

                scope.attributes.flex.status = "overridden" ;
                scope.attributes.binding.status = "overridden" ;
                scope.attributes.isBindEmpty.status = "overridden" ;
                scope.attributes.selectedInput.status = "overridden" ;
                scope.attributes.newItem = function(chip) {
                    return { name: chip, type: 'unknown' };
                };
                scope.$watch('attributes.binding.value', function(binding){
                    binding ? scope.attributes.isBindEmpty.value = false : scope.attributes.isBindEmpty.value = true;
                });
                scope.$watch('attributes.selectedInput.value', function(newValue){
                        $timeout(function () {
                            try{
                                scope.chips = '#' + scope.component_id + '> div > md-chips > md-chips-wrap';
                                $(scope.chips).css("padding-top", "8px");
                            }catch(e){
                                /*console.log(e.message);*/
                            }
                        },0);
                    scope.attributes.isBindEmpty.status = "overridden" ;
                });
                if (!angular.isDefined(attrs.dfxGcDesign) && !angular.isDefined(attrs.dfxGcEdit)) {
                    basectrl.bindScopeVariable(scope, component.attributes.binding.value);
                }
                scope.changeWidth = function(){
                    $('#' + scope.component_id).css('width', scope.attributes.flex.value + '%');
                };
                if (!angular.isDefined(attrs.dfxGcEdit)) { scope.changeWidth(); }
            });
        }
    }
}]);

dfxGControls.directive('dfxGcWebRadio', ['$timeout', '$mdDialog', function($timeout, $mdDialog) {
    return {
        restrict: 'A',
        require: '^dfxGcWebBase',
        scope: true,
        templateUrl: function( el, attrs ) {
            if (angular.isDefined(attrs.dfxGcEdit)) {
                return '/gcontrols/web/radio_edit.html';
            } else if (angular.isDefined(attrs.dfxGcDesign)) {
                return '/gcontrols/web/radio_design.html';
            } else {
                return '/gcontrols/web/radio.html';
            }
        },
        link: function(scope, element, attrs, basectrl) {
            var component = scope.$parent.getComponent(element);
            scope.$gcscope = scope;
            basectrl.init(scope, element, component, attrs, 'radio').then(function(){
                if(!scope.attributes.hasOwnProperty('counterRadioOptions')){scope.attributes.counterRadioOptions = {"value": ""};}
                if(!scope.attributes.hasOwnProperty('isBindingPresent')){scope.attributes.isBindingPresent = {"value": "init"};}
                if(!scope.attributes.hasOwnProperty('dynamicPresent')){scope.attributes.dynamicPresent = {"value": false};}
                if(!scope.attributes.hasOwnProperty('currentIndex')){scope.attributes.currentIndex = {"value": 0};}
                scope.attributes.binding.status = "overridden";
                scope.attributes.source.status = "overridden";
                scope.attributes.currentIndex.status = "overridden";
                scope.attributes.currentItem.status = "overridden";
                scope.attributes.counterRadioOptions.status = "overridden";
                scope.attributes.buttonClass.value = scope.attributes.buttonClass.value.replace("md-primary", "");

                if(!angular.isDefined(attrs.dfxGcDesign) && !angular.isDefined(attrs.dfxGcEdit)) {
                    scope.attributes.currentItem = scope.attributes.radioItems.value[scope.attributes.currentIndex.value];
                    if(scope.$gcscope[scope.attributes.source.value]){
                        scope.attributes.empty.value = scope.$gcscope[scope.attributes.source.value][0][scope.attributes.bindingProperty.value];
                    }
                }

                if(scope.attributes.counterRadioOptions.value === ""){
                    scope.attributes.isBindingPresent.value = false;
                    scope.attributes.counterRadioOptions.value = 2;
                    scope.attributes.currentItem = scope.attributes.radioItems.value[0];
                }

                scope.switchDirection = function(direction){
                    $timeout(function () {
                        try{
                            scope.radiogroup = '#' + scope.component_id + '> div > md-radio-group';
                            scope.radiogroup_buttons = $(scope.radiogroup).children() ;

                            if(direction === 'row'){
                                $(scope.radiogroup).css("display", "inline-block");
                                for(var i = 0; i < scope.radiogroup_buttons.length; i++){
                                    $(scope.radiogroup_buttons[i]).css("display", "inline-block");
                                }
                                scope.$apply(function(){
                                });
                            }else{
                                $(scope.radiogroup).css("display", "block");
                                for(var i = 0; i < scope.radiogroup_buttons.length; i++){
                                    $(scope.radiogroup_buttons[i]).css("display", "block");
                                }
                            }
                        }catch(e){
                            /*console.log(e.message);*/
                        }
                    },0);
                };

                scope.showOptionsEditor = function(ev) {
                    $mdDialog.show({
                        scope: scope.$new(),
                        parent: angular.element(document.body),
                        targetEvent: ev,
                        clickOutsideToClose:true,
                        ariaLabel: 'options-editor',
                        templateUrl: '/gcontrols/web/radio_options_editor.html',
                        onComplete: function() {
                            scope.attributes.radioItems.status = "overridden";
                            $('.menu-structure li').eq(scope.attributes.currentIndex.value).addClass('active');
                        },
                        controller: function() {
                            scope.closeDialog = function() {
                                $mdDialog.hide();
                            }
                        }
                    });
                }

                scope.activeOption = function() {
                    $('.menu-structure li').removeClass('active');
                    $('.menu-structure li').eq( scope.attributes.currentIndex.value ).addClass('active');
                }

                scope.selectOptionItem = function( index ) {
                    scope.attributes.currentIndex.value = index;
                    scope.attributes.currentItem = scope.attributes.radioItems.value[scope.attributes.currentIndex.value];
                    scope.activeOption();
                }

                scope.addItem = function(){
                    scope.attributes.radioItems.status = "overridden";
                    scope.attributes.counterRadioOptions.value++;
                    var optval = "option value " + scope.attributes.counterRadioOptions.value;
                    var optdis = "'option display " + scope.attributes.counterRadioOptions.value + "'";
                    scope.attributes.currentIndex.value = scope.attributes.currentIndex.value + 1;
                    scope.attributes.radioItems.value.splice(scope.attributes.currentIndex.value, 0, {"display":optdis, "value":optval});
                    scope.attributes.currentItem = scope.attributes.radioItems.value[scope.attributes.currentIndex.value];
                    scope.switchDirection(scope.attributes.direction.value);
                    $timeout(function() { scope.activeOption(); }, 0);
                };


                scope.moveOptionUp = function() {
                    if ( scope.attributes.currentIndex.value > 0 ) {
                        var movedOption = scope.attributes.currentItem,
                            fromIndex = scope.attributes.currentIndex.value,
                            toIndex = scope.attributes.currentIndex.value - 1;
                        scope.attributes.radioItems.value.splice(fromIndex, 1);
                        scope.attributes.radioItems.value.splice(toIndex, 0, movedOption);
                        --scope.attributes.currentIndex.value;
                        scope.attributes.currentItem = scope.attributes.radioItems.value[scope.attributes.currentIndex.value];
                        scope.activeOption();
                    }
                }

                scope.moveOptionDown = function() {
                    if ( scope.attributes.currentIndex.value < ( scope.attributes.radioItems.value.length - 1 )) {
                        var movedOption = scope.attributes.currentItem,
                            fromIndex = scope.attributes.currentIndex.value,
                            toIndex = scope.attributes.currentIndex.value + 1;
                        scope.attributes.radioItems.value.splice(fromIndex, 1);
                        scope.attributes.radioItems.value.splice(toIndex, 0, movedOption);
                        ++scope.attributes.currentIndex.value;
                        scope.attributes.currentItem = scope.attributes.radioItems.value[scope.attributes.currentIndex.value];
                        scope.activeOption();
                    }
                }

                scope.$watch('attributes.currentItem', function(newValue, oldvalue){
                    for(var i =0; i < scope.attributes.radioItems.value.length; i++){
                        if(newValue.value === scope.attributes.radioItems.value[i].value && newValue.display === scope.attributes.radioItems.value[i].display){
                            scope.attributes.currentIndex.value = i;
                            break;
                        }
                    }
                    scope.attributes.currentItem = scope.attributes.radioItems.value[scope.attributes.currentIndex.value];
                });

                scope.$watch('attributes.binding.value', function(newValue){
                    if(newValue){
                        scope.attributes.isBindingPresent.value = true;
                    }else{
                        scope.attributes.isBindingPresent.value = false;
                    }
                });

                scope.$watch('attributes.source.value', function(newValue){
                    var sourceExp = /^[-a-z0-9_]+$/gi,
                        sourceRes = sourceExp.test( newValue),
                        startString = isNaN( newValue.charAt(0) );
                    if( newValue && sourceRes && startString ){
                        scope.attributes.dynamicPresent.value = true;
                    }else{
                        scope.attributes.dynamicPresent.value = false;
                    }
                });

                scope.removeOption = function(){
                    scope.attributes.radioItems.status = "overridden";
                    if(scope.attributes.radioItems.value.length === 1){
                        /*console.log('The last option can not be deleted');*/
                        scope.attributes.currentIndex.value = 0;
                        scope.attributes.currentItem = scope.attributes.radioItems.value[0];
                    }else{
                        var temp = scope.attributes.currentIndex.value;
                        scope.attributes.radioItems.value.splice(temp, 1);
                        if(temp === 0){
                            scope.attributes.currentIndex.value = 0;
                            scope.attributes.currentItem = scope.attributes.radioItems.value[0];
                        }else{
                            scope.attributes.currentIndex.value = temp - 1;
                            scope.attributes.currentItem = scope.attributes.radioItems.value[scope.attributes.currentIndex.value];
                        }
                    }
                    scope.activeOption();
                };

                scope.$watch('attributes.direction.value', function(newValue){
                    scope.switchDirection(newValue);
                });

                scope.$watch('$gcscope[attributes.binding.value]', function (newVal) {
                    if (!angular.isDefined(attrs.dfxGcDesign) && !angular.isDefined(attrs.dfxGcEdit)) {
                        if(scope.attributes.isBindingPresent.value){
                            var bindingString = scope.attributes.binding.value;
                            if ( scope.attributes.dynamicPresent.value ) {
                                eval("scope." + bindingString + "= newVal ;");
                            } else {
                                var bindingType = typeof newVal;
                                if ( bindingType === 'boolean' || bindingType === 'number' ) {
                                    scope.attributes.empty.value = '' + newVal;
                                } else if ( bindingType === 'string' ) {
                                    for( var i =0; i < scope.attributes.radioItems.value.length; i++ ){
                                        var checkRadioItem = scope.attributes.radioItems.value[i].value;
                                        if ( checkRadioItem.substring(1, checkRadioItem.length-1) === newVal ) {
                                            scope.attributes.empty.value = "'" + newVal + "'";
                                        }
                                    }
                                }
                            }
                        }
                    }
                });

                if (!angular.isDefined(attrs.dfxGcDesign) && !angular.isDefined(attrs.dfxGcEdit)) {
                    basectrl.bindScopeVariable(scope, component.attributes.binding.value);
                    basectrl.bindScopeVariable(scope, component.attributes.source.value);
                    for (var i = 0; i < scope.attributes.radioItems.value.length; i++) {
                        switch ( scope.attributes.radioItems.value[i].value ) {
                            case 'true': scope.attributes.radioItems.value[i].value = true; break;
                            case 'false': scope.attributes.radioItems.value[i].value = false; break;
                        }
                    }
                    switch ( scope.attributes.currentItem.value ) {
                        case 'true': scope.attributes.currentItem.value = true; break;
                        case 'false': scope.attributes.currentItem.value = false; break;
                    }
                }
            });
        }
    }
}]);

dfxGControls.directive('dfxGcWebDatatable', ['$timeout', '$mdDialog', '$filter', '$http', function($timeout, $mdDialog, $filter, $http) {
    return {
        restrict: 'A',
        require: '^dfxGcWebBase',
        scope: true,
        templateUrl: function( el, attrs ) {
            if (angular.isDefined(attrs.dfxGcEdit)) {
                return '/gcontrols/web/table_edit.html';
            } else if (angular.isDefined(attrs.dfxGcDesign)) {
                return '/gcontrols/web/table_design.html';
            } else {
                return '/gcontrols/web/table.html';
            }
        },
        link: {
            pre : function(scope, element, attrs, basectrl) {
                var component = scope.getComponent(element);
                scope.component_id = component.id;
                scope.attributes = null;
                var orderBy = $filter('orderBy');
                var filterBy = $filter('filter');
                scope.$gcscope = scope;
                scope._selectedAllRows=false;
                scope._selectedRows=[];
                scope.dynamicPresent = false;
                basectrl.init(scope, element, component, attrs, 'table').then(function(){
                    scope.attributes.flex = { "value": 100 };
                    scope.attributes.rangeStart = { "value": 1 };
                    scope.attributes.tableRows = { "value": [] };
                    scope.attributes.columnIndex = { "value": "" };
                    scope.attributes.newId = { "value": "" };
                    if(!scope.attributes.hasOwnProperty('flex')){scope.attributes.flex = {"value": 100}}
                    if(!scope.attributes.hasOwnProperty('modulo')){scope.attributes.modulo = {"value":""}}
                    scope.attributes.bindingClone.status = 'overridden';

                    if(!angular.isDefined(attrs.dfxGcDesign) && !angular.isDefined(attrs.dfxGcEdit)){
                        scope.attributes.bindingClone.value = [];//scope.$gcscope[scope.attributes.binding.value];
                        scope.attributes.columnIndex.value = parseInt(scope.attributes.columnIndex.value);
                        scope.attributes.newId.value = scope.attributes.columns.value.length + 1;
                        scope.attributes.rowCount.value = parseInt(scope.attributes.rowCount.value);
                        scope.attributes.stepsNumber.value = 3;
                        scope.attributes.stepCounter.value = 1;
                        scope.attributes.rangeEnd.value = parseInt(scope.attributes.rowCount.value);
                        scope.attributes.rangeStart.value = 1;
                        scope.attributes.modulo.value = 0;
                        var originalBindingClone = [];

                        if ( !scope.attributes.hasOwnProperty('filterable') ) { scope.attributes.filterable = { "value": false } }
                        if ( !scope.attributes.hasOwnProperty('filterBy') ) { scope.attributes.filterBy = { "value": "" } }
                        if ( !scope.attributes.hasOwnProperty('headerVisible') ) { scope.attributes.filterBy = { "headerVisible": true } }

                        if (scope.attributes.checkBinding.value!='') {
                            scope.dynamicPresent = true;
                            scope._selectedRows = scope.$parent_scope[scope.attributes.checkBinding.value];
                            scope.$watch( '$parent_scope[attributes.checkBinding.value]', function( newValue ) {
                                if ( newValue ) {
                                    scope._selectedRows = newValue;
                                }
                                if ( newValue.length!==0 && angular.equals( newValue, scope.attributes.bindingClone.value ) ) {
                                    scope._selectedAllRows = true;
                                } else {
                                    scope._selectedAllRows = false;
                                }
                            });
                        } else {
                            scope._selectedRows = [];
                        }

                        scope.$watch(scope.attributes.binding.value, function(value) {
                            var val = value || null;
                            if (val) {
                                if (scope.attributes.bindingClone.value == null) {
                                    scope.attributes.bindingClone.value = [];
                                } else {
                                    scope.attributes.bindingClone.value.splice( 0, scope.attributes.bindingClone.value.length );
                                }
                                for (var i=0; i<val.length; i++) {
                                    scope.attributes.bindingClone.value.push(val[i]);
                                }
                                scope.attributes.stepsNumber.value = (scope.attributes.bindingClone.value.length - scope.attributes.bindingClone.value.length % scope.attributes.rowCount.value)/scope.attributes.rowCount.value;
                                originalBindingClone = scope.attributes.bindingClone.value;
                            }
                        }, true);
                    }else{
                        if(scope.attributes.columns.value.length === 0){
                            for (var c = 1; c < 5; c++){
                                var tempNumeric = '', tempAscending = '';
                                switch (c){
                                    case 1: tempNumeric = 'false'; tempAscending = 'false'; break;
                                    case 2: tempNumeric = 'false'; tempAscending = 'true'; break;
                                    case 3: tempNumeric = 'true'; tempAscending = 'false'; break;
                                    case 4: tempNumeric = 'true'; tempAscending = 'true'; break;
                                }
                                var tempColumn = {
                                    "header": "'Column"+c+"'",
                                    "value": "",
                                    "name": "column"+c+"",
                                    "flex": 25,
                                    "columnId":""+c+"",
                                    "renderer": {
                                        "name": "statictext",
                                        "attributes": {
                                            "name": { "value": "txtText"+c+"" },
                                            "text": { "value": "$dfx_item[$dfx_column.value]" }
                                        },
                                        "children": []
                                    },
                                    "isNumeric": tempNumeric,
                                    "isAscending": tempAscending,
                                    "style": "",
                                    "classes": "",
                                    "dynamicClasses": ""
                                }
                                scope.attributes.columns.value.push(tempColumn);
                            }
                        }
                        scope.attributes.columns.status = "overridden";
                        if(scope.attributes.columnIndex.value === "") {
                            scope.attributes.columnIndex.value = 0;
                            scope.attributes.newId.value = scope.attributes.columns.value.length + 1;
                            //scope.attributes.titleVisible.value = true;
                            //scope.attributes.paging.value = true;
                            //scope.attributes.rowCount.value = 3;
                            scope.attributes.stepsNumber.value = 3;
                            scope.attributes.stepCounter.value = 1;
                            scope.attributes.rangeEnd.value = parseInt(scope.attributes.rowCount.value);
                            scope.attributes.rangeStart.value = 1;
                            scope.attributes.modulo.value = 0;
                        }
                    }

                    scope.fillRows = function(){
                        scope.attributes.tableRows.value = [];
                        for (var x = 0; x < 50; x++) {
                            var obj = {};
                            for (var y = 0; y < scope.attributes.columns.value.length; y++) {
                                var key = scope.attributes.columns.value[y].value;
                                if (scope.attributes.columns.value[y].isNumeric === "true") {
                                    obj[key] = (1 + x) * 10 + y + 1;
                                } else {
                                    obj[key] = 'value' + ((1+x)*10 + y+1);
                                }
                            }
                            scope.attributes.tableRows.value.push(obj);
                        }
                        //scope.addStyles();
                    };

                    scope.addStyles = function(){
                        /*$timeout(function () {
                            try{
                                scope.headers = $('#' + scope.component_id + '> md-card > div:nth-child(2) > table > thead > tr').children();
                                scope.rows = $('#' + scope.component_id + '> md-card > div:nth-child(2) > table > tbody').children();
                                for(var i = 0; i < scope.attributes.columns.length; i++){
                                    if(scope.attributes.columns[i].isNumeric === "true"){
                                        $(scope.headers.eq(i+1)).removeClass('dt_first_column dt_last_column dt_left_align dt_first_column_none');
                                        $(scope.headers.eq(i+1)).addClass('dt_right_align');
                                    }else{
                                        $(scope.headers.eq(i+1)).removeClass('dt_first_column dt_last_column dt_right_align dt_first_column_none');
                                        $(scope.headers.eq(i+1)).addClass('dt_left_align');
                                    }
                                    if(i === scope.attributes.columns.length-1){
                                        $(scope.headers.eq(i+1)).addClass('dt_last_column');
                                    }
                                }
                                if(scope.attributes.checkOption.value !== 'none'){
                                    $(scope.headers[1]).addClass('dt_first_column');
                                }else{
                                    $(scope.headers[0]).removeClass('dt_first_column');
                                    $(scope.headers[0]).addClass('dt_first_column_none');
                                }

                                for(var j=0; j < scope.rows.length; j++){
                                    var row = $(scope.rows[j]).children();
                                    for(var k = 1; k < row.length; k++){
                                        if(scope.attributes.columns[k-1].isNumeric === "true"){
                                            $(row[k]).removeClass('dt_first_column dt_last_column dt_left_align dt_first_column_none dt_bold_html');
                                            $(row[k]).addClass('dt_right_align');
                                        }else{
                                            $(row[k]).removeClass('dt_first_column dt_last_column dt_right_align dt_first_column_none dt_bold_html');
                                            $(row[k]).addClass('dt_left_align');
                                            if(scope.attributes.columns[k-1].type === "html"){
                                                $(row[k]).addClass('dt_bold_html');
                                            }
                                        }
                                        if(k === scope.attributes.columns.length){
                                            $(row[k]).addClass('dt_last_column');
                                        }
                                    }
                                    if(scope.attributes.checkOption.value !== 'none'){
                                        $(row[1]).addClass('dt_first_column');
                                    }else{
                                        $(row[0]).removeClass('dt_first_column');
                                        $(row[0]).addClass('dt_first_column_none');
                                    }
                                }

                            }catch(e){
                                console.log(e.message);
                            }
                        },0);*/
                    };

                    if (!angular.isDefined(attrs.dfxGcDesign) && !angular.isDefined(attrs.dfxGcEdit)) {
                        scope.addStyles();
                    }else{
                        scope.fillRows();
                    }

                    scope.showColumnsEditor = function(ev) {
                        $mdDialog.show({
                            scope: scope.$new(),
                            parent: angular.element(document.body),
                            targetEvent: ev,
                            clickOutsideToClose:true,
                            ariaLabel: 'options-editor',
                            templateUrl: '/gcontrols/web/table_columns_editor.html',
                            onComplete: function() {
                                scope.attributes.currentColumn = scope.attributes.columns.value[scope.attributes.columnIndex.value];
                                $('.menu-structure li').eq(scope.attributes.columnIndex.value).addClass('active');
                            },
                            controller: function() {
                                scope.closeDialog = function() {
                                    $mdDialog.hide();
                                }
                            }
                        });
                    }

                    scope.activeOption = function() {
                        $timeout(function(){
                            $('.menu-structure li').removeClass('active');
                            $('.menu-structure li').eq( scope.attributes.columnIndex.value ).addClass('active');
                        }, 0);
                    }

                    scope.selectOptionItem = function( index ) {
                        scope.attributes.columnIndex.value = index;
                        scope.attributes.currentColumn = scope.attributes.columns.value[scope.attributes.columnIndex.value];
                        scope.activeOption();
                    }

                    scope.insertColumn = function(column){
                        var temp = {
                            "header": "'New Column'",
                            "value": "property1",
                            "name": "column1",
                            "columnId":"",
                            "renderer": {
                              "name": "statictext",
                              "attributes": {
                                "name": { "value": "txtText1" },
                                "text": { "value": "$dfx_item[$dfx_column.value]" }
                              },
                              "children": []
                            }
                        };

                        var newId = scope.attributes.newId.value++;
                        temp.columnId = newId;
                        temp.value = 'property' + newId;
                        temp.name = 'column' + newId;
                        if ( scope.attributes.columns.value.length > 0 ) {
                            scope.attributes.columnIndex.value = parseInt(scope.attributes.columnIndex.value)+1;
                        } else {
                            scope.attributes.columnIndex.value = 0;
                        }
                        scope.attributes.columns.value.splice(parseInt(scope.attributes.columnIndex.value)+1, 0, temp);
                        scope.attributes.currentColumn = scope.attributes.columns.value[scope.attributes.columnIndex.value];
                        scope.attributes.sortedBy.value = scope.attributes.columns.value[scope.attributes.columnIndex.value].value;
                        scope.fillRows();
                        scope.activeOption();
                    };

                    scope.moveColumnUp = function() {
                        if ( scope.attributes.columnIndex.value > 0 ) {
                            var movedColumn = scope.attributes.currentColumn,
                                fromIndex = scope.attributes.columnIndex.value,
                                toIndex = scope.attributes.columnIndex.value - 1;
                            scope.attributes.columns.value.splice(fromIndex, 1);
                            scope.attributes.columns.value.splice(toIndex, 0, movedColumn);
                            --scope.attributes.columnIndex.value;
                            scope.attributes.currentColumn = scope.attributes.columns.value[scope.attributes.columnIndex.value];
                            scope.activeOption();
                            $timeout(function(){
                                scope.fillRows();
                            }, 0);
                        }
                    }

                    scope.moveColumnDown = function() {
                        if ( scope.attributes.columnIndex.value < ( scope.attributes.columns.value.length - 1 )) {
                            var movedColumn = scope.attributes.currentColumn,
                                fromIndex = scope.attributes.columnIndex.value,
                                toIndex = scope.attributes.columnIndex.value + 1;
                            scope.attributes.columns.value.splice(fromIndex, 1);
                            scope.attributes.columns.value.splice(toIndex, 0, movedColumn);
                            ++scope.attributes.columnIndex.value;
                            scope.attributes.currentColumn = scope.attributes.columns.value[scope.attributes.columnIndex.value];
                            scope.activeOption();
                            $timeout(function(){
                                scope.fillRows();
                            }, 0);
                        }
                    }

                    scope.removeColumn = function(){
                        if(scope.attributes.columns.value.length > 0){
                            var temp = scope.attributes.columnIndex.value;
                            if(scope.attributes.columnIndex.value > 0){
                                scope.attributes.columnIndex.value = scope.attributes.columnIndex.value - 1;
                            }
                            scope.attributes.columns.value.splice(temp, 1);
                            if ( scope.attributes.columns.value.length > 1 ) {
                                scope.attributes.sortedBy.value = scope.attributes.columns.value[scope.attributes.columnIndex.value].value;
                            } else {
                                scope.attributes.sortedBy.value = '';
                            }
                            scope.attributes.currentColumn = scope.attributes.columns.value[scope.attributes.columnIndex.value];
                            scope.fillRows();
                            scope.activeOption();
                        }
                    };

                    scope.updateSteps = function(){
                        scope.attributes.rangeStart.value = 1;
                        scope.attributes.rangeEnd.value = parseInt(scope.attributes.rowCount.value);
                    }

                    scope.plusStep = function(){
                        if (!angular.isDefined(attrs.dfxGcDesign) && !angular.isDefined(attrs.dfxGcEdit)) {
                            if(scope.attributes.stepCounter.value <= scope.attributes.stepsNumber.value){
                                scope.attributes.stepCounter.value++;
                                if(scope.attributes.stepCounter.value === scope.attributes.stepsNumber.value+1){
                                    scope.attributes.rangeEnd.value = scope.attributes.bindingClone.value.length;
                                    scope.attributes.modulo.value = scope.attributes.bindingClone.value.length % scope.attributes.rowCount.value ;
                                    if(scope.attributes.modulo.value!==0){
                                        scope.attributes.rangeStart.value = scope.attributes.rangeEnd.value - scope.attributes.modulo.value + 1;
                                    }else{
                                        return;
                                    }
                                }else{
                                    scope.attributes.modulo.value = 0;
                                    scope.attributes.rangeEnd.value = scope.attributes.rowCount.value * scope.attributes.stepCounter.value;
                                    scope.attributes.rangeStart.value = scope.attributes.rangeEnd.value - scope.attributes.rowCount.value + 1;
                                }
                            }
                        }else{
                            if(scope.attributes.stepCounter.value <= scope.attributes.stepsNumber.value){
                                scope.attributes.stepCounter.value++;
                                if(scope.attributes.stepCounter.value === scope.attributes.stepsNumber.value+1){
                                    scope.attributes.rangeEnd.value = scope.attributes.tableRows.value.length;
                                    scope.attributes.modulo.value = scope.attributes.tableRows.value.length % scope.attributes.rowCount.value ;
                                    if(scope.attributes.modulo.value!==0){
                                        scope.attributes.rangeStart.value = scope.attributes.rangeEnd.value - scope.attributes.modulo.value + 1;
                                    }else{
                                        return;
                                    }
                                }else{
                                    scope.attributes.modulo.value = 0;
                                    scope.attributes.rangeEnd.value = scope.attributes.rowCount.value * scope.attributes.stepCounter.value;
                                    scope.attributes.rangeStart.value = scope.attributes.rangeEnd.value - scope.attributes.rowCount.value + 1;
                                }
                            }
                        }
                        scope.addStyles();
                    };

                    scope.minusStep = function(){
                        if(scope.attributes.stepCounter.value > 1){
                            scope.attributes.stepCounter.value-- ;
                            scope.attributes.rangeEnd.value = scope.attributes.rowCount.value * scope.attributes.stepCounter.value;
                            scope.attributes.rangeStart.value = scope.attributes.rangeEnd.value - scope.attributes.rowCount.value + 1;
                        }
                        scope.addStyles();
                    };

                    scope.sortOn = function (arr, prop, reverse, numeric) {
                         if (!prop || !arr) {
                            return arr
                         }
                         if(arr.constructor !== Array){
                            arr = [].slice.call(arr) ;
                         }
                         var sort_by = function (field, rev, primer) {
                            return function (a, b) {
                             a = primer(a[field]), b = primer(b[field]);
                             return ((a < b) ? -1 : ((a > b) ? 1 : 0)) * (rev ? -1 : 1);
                            }
                         }
                         if (numeric) {
                                 arr.sort(sort_by(prop, reverse, function (a) {
                                 return parseFloat(String(a).replace(/[^0-9.-]+/g, ''));
                             }));
                         } else {
                             arr.sort(sort_by(prop, reverse, function (a) {
                             return String(a).toUpperCase();
                             }));
                         }
                     };

                    scope.changeIndexAndSortDir = function(index){
                        if(scope.attributes.columns.value[index].value === scope.attributes.sortedBy.value){
                            if(scope.attributes.columns.value[index].isAscending === "true"){
                                scope.attributes.columns.value[index].isAscending = "false";
                            } else{
                                scope.attributes.columns.value[index].isAscending = "true";
                            }
                        }
                        scope.attributes.columnIndex.value = index;
                        scope.attributes.sortedBy.value = scope.attributes.columns.value[index].value;
                        if (!angular.isDefined(attrs.dfxGcDesign) && !angular.isDefined(attrs.dfxGcEdit)) {
                            scope.attributes.bindingClone.value = orderBy(scope.attributes.bindingClone.value, scope.attributes.sortedBy.value, scope.attributes.columns.value[index].isAscending === "true");
                            originalBindingClone = scope.attributes.bindingClone.value;
                        }
                        scope.addStyles();
                    };

                    scope.isSelectedRows = function() {
                        return scope._selectedAllRows;
                    };

                    scope.isSelectedRow = function(item) {
                        return (scope._selectedRows.indexOf(item)>-1);
                    };

                    scope.toggleSelectRows = function() {
                        scope._selectedAllRows = !scope._selectedAllRows;
                        var nb_rows = (!angular.isDefined(attrs.dfxGcDesign) && !angular.isDefined(attrs.dfxGcEdit)) ? scope.attributes.bindingClone.value.length : scope.attributes.tableRows.value.length;
                        scope._selectedRows.splice(0, scope._selectedRows.length);
                        if (scope._selectedAllRows) {
                            for (var i=0; i<nb_rows; i++) {
                                scope._selectedRows.push(scope.attributes.bindingClone.value[i]);
                            }
                        }
                    };

                    scope.toggleSelectRow = function(item) {
                        if (scope._selectedAllRows) {
                            scope._selectedAllRows = false;
                        }
                        var pos_index = scope._selectedRows.indexOf(item);
                        if (pos_index == -1) {
                            scope._selectedRows.push(item);
                        } else {
                            scope._selectedRows.splice(pos_index, 1);
                        }
                        if ( !angular.isDefined(attrs.dfxGcDesign) && !angular.isDefined(attrs.dfxGcEdit) && scope.dynamicPresent ) {
                            scope.$parent_scope[scope.attributes.checkBinding.value] = scope._selectedRows;
                        }
                    };

                    scope.$watch('attributes.rowCount.value', function(newValue, oldValue){
                        if (newValue!=null) {
                            // if (newValue !== oldValue) {
                                scope.attributes.rowCount.status = 'overridden';
                                if (!angular.isDefined(attrs.dfxGcDesign) && !angular.isDefined(attrs.dfxGcEdit)) {
                                    scope.attributes.stepsNumber.value = (scope.attributes.bindingClone.value.length - scope.attributes.bindingClone.value.length % newValue)/newValue;
                                    scope.attributes.stepCounter.value = 1;
                                    scope.attributes.rangeEnd.value = newValue;
                                    scope.attributes.rangeStart.value = 1;
                                    scope.addStyles();
                                } else {
                                    scope.attributes.stepsNumber.value = (scope.attributes.tableRows.value.length - scope.attributes.tableRows.value.length % newValue)/newValue;
                                    scope.attributes.stepCounter.value = 1;
                                    scope.attributes.rangeEnd.value = newValue;
                                    scope.attributes.rangeStart.value = 1;
                                    scope.addStyles();
                                }
                            // }
                        }
                    });

                    scope.filterTableData = function( filterQuery ) {
                        if(!angular.isDefined(attrs.dfxGcDesign) && !angular.isDefined(attrs.dfxGcEdit)){
                            if ( filterQuery !== '' ) {
                                scope.attributes.bindingClone.value = filterBy(originalBindingClone, filterQuery, 'strict');
                            } else {
                                scope.attributes.bindingClone.value = originalBindingClone;
                            }
                            $timeout(function(){
                                scope.attributes.rangeStart.value = 1;
                                scope.attributes.stepCounter.value = 1;
                                scope.attributes.rangeEnd.value = parseInt(scope.attributes.rowCount.value);
                            }, 0);
                        }
                    }

                    scope.changeRenderer = function(index) {
                        var attributes = null;
                        var elementIndex = index ? index : scope.attributes.columnIndex.value;

                        $http.get( '/gcontrols/web/'+scope.attributes.columns.value[elementIndex].renderer.name+'.json' ).success( function (data) {
                            attributes = data;
                        }).then( function() {
                            scope.attributes.columns.value[elementIndex].renderer.attributes = attributes;
                        });
                    };

                    if (!angular.isDefined(attrs.dfxGcDesign) && !angular.isDefined(attrs.dfxGcEdit)) {
                        basectrl.bindScopeVariable(scope, component.attributes.binding.value);
                    }

                    scope.changeWidth = function(){
                        $('#' + scope.component_id).css('width', scope.attributes.flex.value + '%');
                    };
                    if (!angular.isDefined(attrs.dfxGcEdit)) {
                        scope.changeWidth();
                    }
                });
            }
        }
    }
}]);

dfxGControls.directive('dfxGcWebDatepicker', ['$timeout', function($timeout) {
    return {
        restrict: 'A',
        require: '^dfxGcWebBase',
        scope: true,
        templateUrl: function( el, attrs ) {
            if (angular.isDefined(attrs.dfxGcEdit)) {
                return '/gcontrols/web/datepicker_edit.html';
            } else if (angular.isDefined(attrs.dfxGcDesign)) {
                return '/gcontrols/web/datepicker_design.html';
            } else {
                return '/gcontrols/web/datepicker.html';
            }
        },
        link: function(scope, element, attrs, basectrl) {
            var component = scope.$parent.getComponent(element);
            scope.dp_input;
            basectrl.init(scope, element, component, attrs, 'datepicker').then(function(){
                if ( !scope.attributes.hasOwnProperty('flex') ) { scope.attributes.flex = { "value": 20 }; }
                scope.attributes.bindingDate.status = "overridden";
                scope.attributes.ranged.status = "overridden";

                scope.attributes.designDate.value = new Date();

                if (!angular.isDefined(attrs.dfxGcDesign) && !angular.isDefined(attrs.dfxGcEdit)) {
                    if(scope.attributes.bindingExpression.value === ""){
                        scope.attributes.bindingDate.value = new Date();
                    }else{
                        try{
                            scope.attributes.bindingDate.value = eval(scope.attributes.bindingExpression.value);
                        }catch(e){
                            scope.attributes.bindingDate.value = eval('scope.' + scope.attributes.bindingExpression.value);
                            scope.attributes.bindingDate.value = new Date(scope.attributes.bindingDate.value);
                        }
                    }
                }else{
                    scope.minDate = new Date(
                        scope.attributes.designDate.value.getFullYear(),
                        scope.attributes.designDate.value.getMonth() - scope.attributes.ranged.monthsBefore,
                        scope.attributes.designDate.value.getDate());

                    scope.maxDate = new Date(
                        scope.attributes.designDate.value.getFullYear(),
                        scope.attributes.designDate.value.getMonth() + scope.attributes.ranged.monthsAfter,
                        scope.attributes.designDate.value.getDate());

                }

                if(!scope.attributes.labelClass){
                    scope.attributes.labelClass = 'dp-label-focus-off';
                }

                scope.$watch('attributes.ranged.monthsBefore', function(monthsBefore){
                    if (!angular.isDefined(attrs.dfxGcDesign) && !angular.isDefined(attrs.dfxGcEdit)) {
                        scope.minDate = new Date(
                            eval(scope.attributes.bindingDate.value).getFullYear(),
                            eval(scope.attributes.bindingDate.value).getMonth() - monthsBefore,
                            eval(scope.attributes.bindingDate.value).getDate());
                    }else{
                        scope.minDate = new Date(
                            eval(scope.attributes.designDate.value).getFullYear(),
                            eval(scope.attributes.designDate.value).getMonth() - monthsBefore,
                            eval(scope.attributes.designDate.value).getDate());
                    }

                });

                scope.$watch('attributes.ranged.monthsAfter', function(monthsAfter){
                    if (!angular.isDefined(attrs.dfxGcDesign) && !angular.isDefined(attrs.dfxGcEdit)) {
                        scope.maxDate = new Date(
                            eval(scope.attributes.bindingDate.value).getFullYear(),
                            eval(scope.attributes.bindingDate.value).getMonth() + monthsAfter,
                            eval(scope.attributes.bindingDate.value).getDate());
                    }else{
                        scope.maxDate = new Date(
                            eval(scope.attributes.designDate.value).getFullYear(),
                            eval(scope.attributes.designDate.value).getMonth() + monthsAfter,
                            eval(scope.attributes.designDate.value).getDate());
                    }
                    scope.attributes.alignment.status = "overridden" ;
                });

                scope.$watch('attributes.alignment.value', function(newValue){
                    $timeout(function(){
                            if (!angular.isDefined(attrs.dfxGcDesign) && !angular.isDefined(attrs.dfxGcEdit)) {
                            var preview_wrapper = '#' + scope.component_id;
                            $(preview_wrapper).addClass('flex-'+ scope.attributes.flex.value) ;
                        }
                    },0);
                    scope.setAlignment(newValue);
                });

                scope.setAlignment = function(alignment){
                    $timeout(function(){
                        var dp_input = '#' + scope.component_id + '> form > div > div > md-datepicker > div.md-datepicker-input-container > input' ;
                        $(dp_input).css('text-align', alignment);
                    },0)
                };

                $timeout(function () {
                    try{
                        scope.dp_input = '#' + scope.component_id + '> form > div > div > md-datepicker > div.md-datepicker-input-container > input';
                        $(scope.dp_input).focus(function(){
                            scope.attributes.labelClass = 'dp-label-focus-on';
                            scope.$apply(function(){
                            });
                        });
                        $(scope.dp_input).blur(function(){
                            scope.attributes.labelClass = 'dp-label-focus-off';
                            scope.$apply(function(){
                            });
                        });

                    }catch(e){
                        /*console.log(e.message);*/
                    }
                },0);

                scope.changeWidth = function(){
                    $('#' + scope.component_id).css('width', scope.attributes.flex.value + '%');
                };
                if (!angular.isDefined(attrs.dfxGcEdit)) {
                    scope.changeWidth();
                }
            });
        }
    }
}]);


dfxGControls.directive('dfxGcWebButton', ['$timeout', '$compile', '$filter', function($timeout, $compile, $filter) {
    return {
        restrict: 'A',
        require: '^dfxGcWebBase',
        scope: true,
        templateUrl: function( el, attrs ) {
            if (angular.isDefined(attrs.dfxGcEdit)) {
                return '/gcontrols/web/button_edit.html';
            } else if (angular.isDefined(attrs.dfxGcDesign)) {
                return '/gcontrols/web/button_design.html';
            } else {
                return '/gcontrols/web/button.html';
            }
        },
        link: {
            pre: function(scope, element, attrs, basectrl) {
                var component = scope.getComponent(element);
                scope.component_id = component.id;
                scope.attributes = null;
                basectrl.init(scope, element, component, attrs, 'button').then(function() {
                    scope.attributes.dynamicPresent = { "value": false, "status": "overridden" },
                    scope.attributes.dynamic.status = "overridden";
                    scope.attributes.icon.status = "overridden";
                    scope.attributes.layoutType = { "value": "none" };
                    scope.component_class = attrs.id;
                    if (!angular.isDefined(attrs.dfxGcDesign) && !angular.isDefined(attrs.dfxGcEdit)) {
                        if(scope.attributes.dynamicPresent.value){
                            scope.dynamicItems = eval('scope.' + scope.attributes.dynamic.value);
                            try{
                                if(scope.dynamicItems.constructor === Array ){
                                    if(scope.dynamicItems.length > 0){
                                        scope.attributes.dynamicPresent.value = true;
                                    }else{
                                        scope.attributes.dynamicPresent.value = false;
                                    }
                                }else{
                                    scope.attributes.dynamicPresent.value = false;
                                }
                            }catch(e){
                                scope.attributes.dynamicPresent.value = false;
                            }
                        }else{
                            scope.attributes.dynamicPresent.value = false;
                        }
                    }
                    if ( typeof scope.attributes.icon === 'string' ) {
                        var tempIcon = scope.attributes.icon;
                        scope.attributes.icon = {
                            "value": tempIcon,
                            "type": scope.attributes.hasOwnProperty('iconType') ? scope.attributes.iconType : 'fa-icon'
                        }
                    }
                    if ( !scope.attributes.icon.hasOwnProperty('size') ) { scope.attributes.icon.size = 21; }
                    $timeout(function(){
                        if (scope.attributes.icon.value.indexOf("'") === -1 && scope.attributes.icon.value !== '' && scope.attributes.icon.type === 'fa-icon' ) {
                            if (angular.isDefined(attrs.dfxGcEdit) || angular.isDefined(attrs.dfxGcDesign)) {
                                $('#' + component.id).find('md-icon').attr('class','fa fa-home');
                            }
                        }
                    }, 0);
                    if ( !scope.attributes.icon.hasOwnProperty('position') ) {
                        scope.attributes.icon.position = scope.attributes.position ? scope.attributes.position.value : 'left';
                        scope.attributes.icon.style = "";
                        scope.attributes.icon.class = "";
                        scope.attributes.singleMenu = {"button": { "style": "", "class": "" }, "icon": { "size": 16, "style": "", "class": ""}}
                        delete scope.attributes.position;
                    }
                    if ( scope.attributes.classes.value.indexOf('md-raised') > -1 ) { scope.attributes.classes.value = scope.attributes.classes.value.replace('md-raised', ""); }
                    if ( scope.attributes.classes.value.indexOf('md-primary') > -1 ) { scope.attributes.classes.value = scope.attributes.classes.value.replace('md-primary', ""); }
                    scope.ifShowIconTypes = function( icon, type ) {
                        var regexp = /(^\')(.*)(\'$)/gm, filtered = regexp.exec( icon );
                        if ( icon && ( icon.indexOf('+') >= 0 ) ) { filtered = false; }
                        if ( icon === '' ) { filtered = true; }
                        if ( icon.indexOf("'") === 0 && icon.indexOf('+') === -1 && icon.charAt(icon.length-1) === "'" && !type ) {
                            icon.indexOf("'fa-") === 0 ? scope.attributes.icon.type = 'fa-icon' : scope.attributes.icon.type = 'svg-icon';
                        } else if ( icon.indexOf("'") === 0 && icon.indexOf('+') === -1 && icon.charAt(icon.length-1) === "'" && type !== '' ) {
                            switch ( type ) {
                                case 'checked': icon.indexOf("'fa-") === 0 ? scope.attributes.state.checkedIcon.type = 'fa-icon' : scope.attributes.state.checkedIcon.type = 'svg-icon'; break;
                                case 'unchecked': icon.indexOf("'fa-") === 0 ? scope.attributes.state.uncheckedIcon.type = 'fa-icon' : scope.attributes.state.uncheckedIcon.type = 'svg-icon'; break;
                                case 'waiting': icon.indexOf("'fa-") === 0 ? scope.attributes.waiting.icon.type = 'fa-icon' : scope.attributes.waiting.icon.type = 'svg-icon'; break;
                            }
                        }
                        if ( !type ) {
                            scope.showIconTypes = filtered ? false : true;
                        } else if ( type !== '' ) {
                            switch ( type ) {
                                case 'checked': scope.showCheckedIconTypes = filtered ? false : true; break;
                                case 'unchecked': scope.showUncheckedIconTypes = filtered ? false : true; break;
                                case 'waiting': scope.showWaitingIconTypes = filtered ? false : true; break;
                            }
                        }

                    }
                    scope.ifShowIconTypes(scope.attributes.icon.value);
                    var singleMenuItem = '<md-button ng-show="{{itemDisplay}}" ng-disabled="{{itemDisabled}}" ng-click="{{itemClick}}" class="dfx-menu-button {{attributes.singleMenu.class}}" style="{{attributes.singleMenu.style}}" aria-label="iconbar-button" >'+
                            '<md-icon ng-if="{{ifFaIcon}}" class="fa {{faIcon}} dfx-menu-button-icon {{attributes.singleMenu.icon.class}}" style="font-size:{{attributes.singleMenu.icon.size}}px; {{attributes.singleMenu.icon.style}}"></md-icon>'+
                            '<ng-md-icon ng-if="{{ifSvgIcon}}" icon="{{svgIcon}}" size="{{attributes.singleMenu.icon.size}}" class="dfx-menu-button-icon {{attributes.singleMenu.icon.class}}" style="{{attributes.singleMenu.icon.style}}"></ng-md-icon>'+
                            '<span>{{itemLabel}}</span>'+
                            '<span class="md-alt-text">{{itemShortcut}}</span>'+
                            '<small ng-if="{{ifItemNotification}}">{{itemNotification}}</small>'+
                        '</md-button>',
                        iconbarMenuItem =   '<md-menu-item ng-if="{{itemDisplay}}">';
                    var buildNextLevel = function (nextLevel) {
                        for (var i = 0; i < nextLevel.length; i++) {
                            if ( nextLevel[i].hasOwnProperty('icon') && typeof nextLevel[i].icon === 'string' ) {
                                var tempIcon = nextLevel[i].icon;
                                nextLevel[i].icon = {
                                    "value": tempIcon,
                                    "type": nextLevel[i].hasOwnProperty('iconType') ? nextLevel[i].iconType : 'fa-icon'
                                }
                            }
                            if ( nextLevel[i].menuItems.value.length > 0 ) {
                                next = nextLevel[i].menuItems.value;
                                if (angular.isDefined(attrs.dfxGcEdit) || angular.isDefined(attrs.dfxGcDesign)) {
                                    var iconbarItem = iconbarMenuItem.replace('{{itemDisplay}}', true);
                                } else {
                                    var iconbarItem = iconbarMenuItem.replace('{{itemDisplay}}', typeof nextLevel[i].display === 'string' ? nextLevel[i].display.replace(/"/g, '\'') : nextLevel[i].display);
                                }
                                scope.iconBar = scope.iconBar + iconbarItem + '<md-menu>';
                                if (angular.isDefined(attrs.dfxGcEdit) || angular.isDefined(attrs.dfxGcDesign)) {
                                    var singleMenu = singleMenuItem
                                        .replace('{{ifFaIcon}}', nextLevel[i].icon.value.length > 0 && nextLevel[i].icon.type === 'fa-icon' ? true : false )
                                        .replace('{{ifSvgIcon}}', nextLevel[i].icon.value.length > 0 && nextLevel[i].icon.type === 'svg-icon' ? true : false )
                                        .replace('{{faIcon}}', nextLevel[i].icon.value.indexOf("'") == -1 ? 'fa-home' : eval(nextLevel[i].icon.value.replace(/"/g, '\'')) )
                                        .replace('{{svgIcon}}', nextLevel[i].icon.value.indexOf("'") == -1 ? 'home' : eval(nextLevel[i].icon.value.replace(/"/g, '\'')) )
                                        .replace('{{itemLabel}}', $filter('checkExpression')(nextLevel[i].label.replace(/"/g, '\'')))
                                        .replace('{{itemShortcut}}', nextLevel[i].shortcut.replace(/"/g, '\''))
                                        .replace('{{ifItemNotification}}', nextLevel[i].notification !=='' ? true : false )
                                        .replace('{{itemNotification}}', nextLevel[i].notification )
                                        .replace('{{itemDisplay}}', typeof nextLevel[i].display === 'string' ? nextLevel[i].display.replace(/"/g, '\'') : nextLevel[i].display)
                                        .replace('{{itemDisabled}}', typeof nextLevel[i].disabled === 'string' ? nextLevel[i].disabled.replace(/"/g, '\'') : nextLevel[i].disabled)
                                        .replace('{{itemClick}}', '$mdOpenMenu();'+nextLevel[i].onclick.replace(/"/g, '\''));
                                } else {
                                    var singleMenu = singleMenuItem
                                        .replace('{{ifFaIcon}}', nextLevel[i].icon.value.length > 0 && nextLevel[i].icon.type === 'fa-icon' ? true : false )
                                        .replace('{{ifSvgIcon}}', nextLevel[i].icon.value.length > 0 && nextLevel[i].icon.type === 'svg-icon' ? true : false )
                                        .replace('{{faIcon}}', nextLevel[i].icon.value.indexOf("'") == -1 ? '{{'+nextLevel[i].icon.value+'}}' : eval(nextLevel[i].icon.value.replace(/"/g, '\'')) )
                                        .replace('{{svgIcon}}', nextLevel[i].icon.value.indexOf("'") == -1 ? '{{'+nextLevel[i].icon.value+'}}' : eval(nextLevel[i].icon.value.replace(/"/g, '\'')) )
                                        .replace('{{itemLabel}}', '{{'+nextLevel[i].label.replace(/"/g, '\'')+'}}' )
                                        .replace('{{itemShortcut}}', nextLevel[i].shortcut)
                                        .replace('{{ifItemNotification}}', nextLevel[i].notification !=='' ? true : false )
                                        .replace('{{itemNotification}}', '{{'+nextLevel[i].notification+'}}' )
                                        .replace('{{itemDisplay}}', typeof nextLevel[i].display === 'string' ? nextLevel[i].display.replace(/"/g, '\'') : nextLevel[i].display)
                                        .replace('{{itemDisabled}}', typeof nextLevel[i].disabled === 'string' ? nextLevel[i].disabled.replace(/"/g, '\'') : nextLevel[i].disabled)
                                        .replace('{{itemClick}}', '$mdOpenMenu();'+nextLevel[i].onclick.replace(/"/g, '\''));
                                }
                                scope.iconBar = scope.iconBar + singleMenu +'<md-menu-content width="4">';
                                buildNextLevel(next);
                                scope.iconBar = scope.iconBar + '</md-menu-content></md-menu></md-menu-item>';
                            } else {
                                if ( nextLevel[i].divider === true ) {
                                    scope.iconBar = scope.iconBar + '<md-menu-divider></md-menu-divider>';
                                } else {
                                    if ( !nextLevel[i].hasOwnProperty('iconType') && !nextLevel[i].divider && !nextLevel[i].title) { nextLevel[i].iconType = 'fa-icon'; }
                                    if (angular.isDefined(attrs.dfxGcEdit) || angular.isDefined(attrs.dfxGcDesign)) {
                                        var iconbarItem = iconbarMenuItem.replace('{{itemDisplay}}', true);
                                    } else {
                                        var iconbarItem = iconbarMenuItem.replace('{{itemDisplay}}', typeof nextLevel[i].display === 'string' ? nextLevel[i].display.replace(/"/g, '\'') : nextLevel[i].display);
                                    }
                                    scope.iconBar = scope.iconBar + iconbarItem;
                                    if (angular.isDefined(attrs.dfxGcEdit) || angular.isDefined(attrs.dfxGcDesign)) {
                                        var singleMenu = singleMenuItem
                                            .replace('{{ifFaIcon}}', nextLevel[i].icon.value.length > 0 && nextLevel[i].icon.type === 'fa-icon' ? true : false )
                                            .replace('{{ifSvgIcon}}', nextLevel[i].icon.value.length > 0 && nextLevel[i].icon.type === 'svg-icon' ? true : false )
                                            .replace('{{faIcon}}', nextLevel[i].icon.value.indexOf("'") == -1 ? 'fa-home' : eval(nextLevel[i].icon.value.replace(/"/g, '\'')) )
                                            .replace('{{svgIcon}}', nextLevel[i].icon.value.indexOf("'") == -1 ? 'home' : eval(nextLevel[i].icon.value.replace(/"/g, '\'')) )
                                            .replace('{{itemLabel}}', $filter('checkExpression')(nextLevel[i].label.replace(/"/g, '\'')))
                                            .replace('{{itemShortcut}}', nextLevel[i].shortcut.replace(/"/g, '\''))
                                            .replace('{{ifItemNotification}}', nextLevel[i].notification !=='' ? true : false )
                                            .replace('{{itemNotification}}', nextLevel[i].notification )
                                            .replace('{{itemDisplay}}', true)
                                            .replace('{{itemDisabled}}', typeof nextLevel[i].disabled === 'string' ? nextLevel[i].disabled.replace(/"/g, '\'') : nextLevel[i].disabled)
                                            .replace('{{itemClick}}', nextLevel[i].onclick.replace(/"/g, '\''));
                                    } else {
                                        var singleMenu = singleMenuItem
                                            .replace('{{ifFaIcon}}', nextLevel[i].icon.value.length > 0 && nextLevel[i].icon.type === 'fa-icon' ? true : false )
                                            .replace('{{ifSvgIcon}}', nextLevel[i].icon.value.length > 0 && nextLevel[i].icon.type === 'svg-icon' ? true : false )
                                            .replace('{{faIcon}}', nextLevel[i].icon.value.indexOf("'") == -1 ? '{{'+nextLevel[i].icon.value+'}}' : eval(nextLevel[i].icon.value.replace(/"/g, '\'')) )
                                            .replace('{{svgIcon}}', nextLevel[i].icon.value.indexOf("'") == -1 ? '{{'+nextLevel[i].icon.value+'}}' : eval(nextLevel[i].icon.value.replace(/"/g, '\'')) )
                                            .replace('{{itemLabel}}', '{{'+nextLevel[i].label.replace(/"/g, '\'')+'}}' )
                                            .replace('{{itemShortcut}}', nextLevel[i].shortcut.replace(/"/g, '\''))
                                            .replace('{{ifItemNotification}}', nextLevel[i].notification !=='' ? true : false )
                                            .replace('{{itemNotification}}', '{{'+nextLevel[i].notification+'}}' )
                                            .replace('{{itemDisplay}}', typeof nextLevel[i].display === 'string' ? nextLevel[i].display.replace(/"/g, '\'') : nextLevel[i].display)
                                            .replace('{{itemDisabled}}', typeof nextLevel[i].disabled === 'string' ? nextLevel[i].disabled.replace(/"/g, '\'') : nextLevel[i].disabled)
                                            .replace('{{itemClick}}', nextLevel[i].onclick.replace(/"/g, '\''));
                                    }
                                    scope.iconBar = scope.iconBar + singleMenu + '</md-menu-item>';
                                }
                            }
                        };
                        scope.iconBarMenu = scope.iconBar;
                    }
                    scope.buttonMenuBuilder = function() {
                        if (!angular.isDefined(attrs.dfxGcEdit) && !angular.isDefined(attrs.dfxGcDesign)) {
                                if(scope.attributes.dynamicPresent.value){
                                    scope.iconbarArray = scope.dynamicItems;
                                    scope.attributes.menuItems.value = scope.iconbarArray;
                                }else{
                                    scope.iconbarArray = scope.attributes.menuItems.value;
                                    scope.attributes.menuItems.value = scope.iconbarArray;
                                }
                            }else{
                                scope.iconbarArray = scope.attributes.menuItems.value;
                            }
                        if ( scope.iconbarArray.length > 0 ) {
                            scope.iconBar = '';
                            buildNextLevel(scope.iconbarArray);
                            $timeout(function() {
                                $('.' + scope.component_class + '_button_menu').empty();
                                if (!angular.isDefined(attrs.dfxGcEdit) && !angular.isDefined(attrs.dfxGcDesign)) {
                                    $('.' + scope.component_class + '_button_menu').load('/gcontrols/web/button_menu.html', function(){
                                        $('.' + scope.component_class + '_button_menu md-menu-content').html(scope.iconBarMenu);
                                        $compile($('.' + scope.component_class + '_button_menu').contents())(scope);
                                    });
                                } else {
                                    if ( scope.component_class.indexOf('renderer') === -1 ) {
                                        $('.' + scope.component_class + '_button_menu').load('/gcontrols/web/button_menu_design.html', function(){
                                            $('.' + scope.component_class + '_button_menu md-menu-content.root-content').html(scope.iconBarMenu);
                                            $compile($('.' + scope.component_class + '_button_menu').contents())(scope);
                                        });
                                    } else {
                                        $timeout(function() {
                                            var tableButtons = $('.' + scope.component_class + '_button_menu');
                                            $(tableButtons).each(function(index, element) {
                                                tableButtons.eq(index).empty().load('/gcontrols/web/button_menu_design.html', function() {
                                                    tableButtons.eq(index).find('md-menu-content.root-menu-container').html(scope.iconBarMenu);
                                                    $compile(tableButtons.eq(index).contents())(scope);
                                                });
                                            });
                                        }, 0, false);
                                    }
                                }
                            }, 0);
                        }
                    }
                    scope.$watch('attributes.menuItems.value', function(newVal, oldVal) {
                        if ( newVal != null && !angular.equals(newVal, oldVal) ) {
                            $timeout(function() {
                                scope.buttonMenuBuilder();
                            }, 0, false);
                        }
                    }, true);

                    scope.$watch("attributes.dynamic.value", function(newValue){
                        $timeout(function(){
                            if (scope.attributes.dynamicPresent==null) {
                                scope.attributes.dynamicPresent = { "value": "" };
                                scope.attributes.dynamic = { "value": "" };
                            }
                            if(typeof newValue !== "undefined" && newValue !== null && newValue !== ""){
                                scope.attributes.dynamicPresent.value = true;

                            }else{
                                scope.attributes.dynamicPresent.value = false;
                            }
                        }, 0);
                    });
                    scope.buttonMenuBuilder();
                    if ( !scope.attributes.hasOwnProperty('waiting') ) {
                        scope.attributes.waiting = {
                            "value": "",
                            "icon": { "value": "'fa-spinner'", "type": "fa-icon", "style": "", "class": "fa-pulse" }
                        }
                    }
                });
            }
        }
    }
}]);

dfxGControls.directive('dfxGcWebIcon', ['$http', '$mdDialog', '$timeout', '$filter', function($http, $mdDialog, $timeout, $filter) {
    return {
        restrict: 'A',
        require: '^dfxGcWebBase',
        scope: true,
        templateUrl: function( el, attrs ) {
            if (angular.isDefined(attrs.dfxGcEdit)) {
                return '/gcontrols/web/icon_edit.html';
            } else if (angular.isDefined(attrs.dfxGcDesign)) {
                return '/gcontrols/web/icon_design.html';
            } else {
                return '/gcontrols/web/icon.html';
            }
        },
        link: function(scope, element, attrs, basectrl) {
            var component = scope.getComponent(element);
            scope.$gcscope = scope;
            basectrl.init(scope, element, component, attrs, 'icon').then(function() {
                scope.attributes.icon.status = "overridden";
                scope.attributes.state.status = "overridden";
                scope.attributes.waiting.status = "overridden";
                if ( typeof scope.attributes.icon === 'string' ) {
                    var tempIcon = scope.attributes.icon;
                    scope.attributes.icon = {
                        "value": tempIcon,
                        "type": scope.attributes.hasOwnProperty('iconType') ? scope.attributes.iconType : 'fa-icon'
                    }
                }
                if ( !scope.attributes.icon.hasOwnProperty('size') ) {
                    if ( scope.attributes.size ) {
                        scope.attributes.icon.size = scope.attributes.size.value;
                        delete scope.attributes.size;
                    } else {
                        scope.attributes.icon.size = 36;
                    }
                }
                if ( scope.attributes.state.icon ) {
                    scope.attributes.state.icon.color = ""; scope.attributes.state.checkedIcon.color = ""; scope.attributes.state.uncheckedIcon.color = "";
                }
                scope.ifShowIconTypes = function( icon, type ) {
                    var regexp = /(^\')(.*)(\'$)/gm, filtered = regexp.exec( icon );
                    if ( icon && ( icon.indexOf('+') >= 0 ) ) { filtered = false; }
                    if ( icon === '' ) { filtered = true; }
                    if ( icon.indexOf("'") === 0 && icon.indexOf('+') === -1 && icon.charAt(icon.length-1) === "'" && !type ) {
                        icon.indexOf("'fa-") === 0 ? scope.attributes.icon.type = 'fa-icon' : scope.attributes.icon.type = 'svg-icon';
                    } else if ( icon.indexOf("'") === 0 && icon.indexOf('+') === -1 && icon.charAt(icon.length-1) === "'" && type !== '' ) {
                        switch ( type ) {
                            case 'checked': icon.indexOf("'fa-") === 0 ? scope.attributes.state.checkedIcon.type = 'fa-icon' : scope.attributes.state.checkedIcon.type = 'svg-icon'; break;
                            case 'unchecked': icon.indexOf("'fa-") === 0 ? scope.attributes.state.uncheckedIcon.type = 'fa-icon' : scope.attributes.state.uncheckedIcon.type = 'svg-icon'; break;
                            case 'waiting': icon.indexOf("'fa-") === 0 ? scope.attributes.waiting.icon.type = 'fa-icon' : scope.attributes.waiting.icon.type = 'svg-icon'; break;
                        }
                    }
                    if ( !type ) {
                        scope.showIconTypes = filtered ? false : true;
                    } else if ( type !== '' ) {
                        switch ( type ) {
                            case 'checked': scope.showCheckedIconTypes = filtered ? false : true; break;
                            case 'unchecked': scope.showUncheckedIconTypes = filtered ? false : true; break;
                            case 'waiting': scope.showWaitingIconTypes = filtered ? false : true; break;
                        }
                    }

                }
                scope.ifShowIconTypes(scope.attributes.icon.value);
                scope.checkState = function(){
                    if ( scope.attributes.state.binding !== '' ) {
                        if (!angular.isDefined(attrs.dfxGcDesign) && !angular.isDefined(attrs.dfxGcEdit)) {
                            if ( scope.attributes.state.binding === 'true' || scope.attributes.state.binding === 'false' ) {
                                switch ( scope.attributes.state.binding ) {
                                    case 'true': scope.attributes.state.binding = 'false'; scope.attributes.state.icon = scope.attributes.state.uncheckedIcon; break;
                                    case 'false': scope.attributes.state.binding = 'true'; scope.attributes.state.icon = scope.attributes.state.checkedIcon; break;
                                }
                            } else {
                                if ( scope.$gcscope[scope.attributes.state.binding] || !scope.$gcscope[scope.attributes.state.binding] ) {
                                    if ( scope.$gcscope[scope.attributes.state.binding] === 'true' ) {
                                        scope.$gcscope[scope.attributes.state.binding] = 'false'; scope.attributes.state.icon = scope.attributes.state.uncheckedIcon;
                                    } else if ( scope.$gcscope[scope.attributes.state.binding] === true ) {
                                        scope.$gcscope[scope.attributes.state.binding] = false; scope.attributes.state.icon = scope.attributes.state.uncheckedIcon;
                                    } else if ( scope.$gcscope[scope.attributes.state.binding] === 'false' ) {
                                        scope.$gcscope[scope.attributes.state.binding] = 'true'; scope.attributes.state.icon = scope.attributes.state.checkedIcon;
                                    } else if ( !scope.$gcscope[scope.attributes.state.binding] ) {
                                        scope.$gcscope[scope.attributes.state.binding] = true; scope.attributes.state.icon = scope.attributes.state.checkedIcon;
                                    }
                                }
                            }
                        } else {
                            switch ( scope.attributes.state.binding ) {
                                case 'true': scope.attributes.state.binding = 'false'; scope.attributes.state.icon = scope.attributes.state.uncheckedIcon; break;
                                case 'false': scope.attributes.state.binding = 'true'; scope.attributes.state.icon = scope.attributes.state.checkedIcon; break;
                            }
                        }
                    }
                }
                if ( !scope.attributes.hasOwnProperty('waiting') ) {
                    scope.attributes.waiting = {
                        "value": "",
                        "autoDisabled": false,
                        "icon": { "value": "'fa-spinner'", "type": "fa-icon", "style": "", "class": "fa-pulse" }
                    }
                }
                if (!angular.isDefined(attrs.dfxGcDesign) && !angular.isDefined(attrs.dfxGcEdit)) {
                    if ( scope.attributes.state.binding !== '' && scope.attributes.state.binding !== 'true' && scope.attributes.state.binding !== 'false' ) {
                        basectrl.bindScopeVariable(scope, component.attributes.state.binding);
                        if ( scope.$gcscope[scope.attributes.state.binding] === true || scope.$gcscope[scope.attributes.state.binding] === 'true' ) {
                            scope.attributes.state.icon = scope.attributes.state.checkedIcon;
                        } else if ( scope.$gcscope[scope.attributes.state.binding] === 'false' || !scope.$gcscope[scope.attributes.state.binding] ) {
                            scope.attributes.state.icon = scope.attributes.state.uncheckedIcon;
                        }
                    } else {
                        if ( scope.attributes.state.binding === 'true' || scope.attributes.state.binding === 'false' ) {
                            switch ( scope.attributes.state.binding ) {
                                case 'true': scope.attributes.state.icon = scope.attributes.state.checkedIcon; break;
                                case 'false': scope.attributes.state.icon = scope.attributes.state.uncheckedIcon; break;
                            }
                        }
                    }
                } else {
                    scope.attributes.state.icon = scope.attributes.state.checkedIcon;
                }
            });
        }
    }
}]);

dfxGControls.directive('dfxGcWebProgressbar', function() {
    return {
        restrict: 'A',
        require: '^dfxGcWebBase',
        scope: true,
        templateUrl: function( el, attrs ) {
            if (angular.isDefined(attrs.dfxGcEdit)) {
                return '/gcontrols/web/progress_bar_edit.html';
            } else if (angular.isDefined(attrs.dfxGcDesign)) {
                return '/gcontrols/web/progress_bar_design.html';
            } else {
                return '/gcontrols/web/progress_bar.html';
            }
        },
        link: function(scope, element, attrs, basectrl) {
            var component = scope.getComponent(element);
            scope.$gcscope = scope;
            basectrl.init(scope, element, component, attrs, 'progressbar').then(function() {
                scope.attributes.flex.status = "overridden";
                if (!angular.isDefined(attrs.dfxGcDesign) && !angular.isDefined(attrs.dfxGcEdit)) {
                    basectrl.bindScopeVariable( scope, component.attributes.binding.value );
                }
            });
        }
    }
});

dfxGControls.directive('dfxGcWebGooglemap',['$timeout', function( $timeout ) {
    return {
        restrict: 'A',
        require: '^dfxGcWebBase',
        scope: true,
        templateUrl: function( el, attrs ) {
            if (angular.isDefined(attrs.dfxGcEdit)) {
                return '/gcontrols/web/google_map_edit.html';
            } else if (angular.isDefined(attrs.dfxGcDesign)) {
                return '/gcontrols/web/google_map_design.html';
            } else {
                return '/gcontrols/web/google_map.html';
            }
        },
        link: function(scope, element, attrs, basectrl) {
            var component = scope.getComponent(element);
            scope.$gcscope = scope;
            basectrl.init(scope, element, component, attrs, 'googlemap').then(function() {
                scope.attributes.flex.status = "overridden";
                var map_id = 'map' + attrs.id;
                    $timeout(function () {
                        if ($('#'+map_id).is(':empty')) {
                            (function initMap() {
                                if (typeof google != 'undefined') {
                                    if (!angular.isDefined(attrs.dfxGcDesign) && !angular.isDefined(attrs.dfxGcEdit)) {
                                        basectrl.bindScopeVariable( scope, component.attributes.binding.value );
                                        var locations = scope.$gcscope[scope.attributes.binding.value];
                                        var map = new google.maps.Map(document.getElementById(map_id), {
                                            center: {lat: -34.397, lng: 150.644},
                                            zoom: 8
                                        });

                                        if (typeof locations != 'undefined') {

                                            var infowindow = new google.maps.InfoWindow;

                                            var marker, i;

                                            var bounds = new google.maps.LatLngBounds();

                                            for (i = 0; i < locations.length; i++) {
                                                marker = new google.maps.Marker({
                                                    position: new google.maps.LatLng(locations[i].latitude, locations[i].longitude),
                                                    icon: locations[i].icon,
                                                    map: map
                                                });

                                                google.maps.event.addListener(marker, 'click', (function (marker, i) {
                                                    return function () {
                                                        infowindow.setContent(locations[i].description);
                                                        infowindow.open(map, marker);
                                                    }
                                                })(marker, i));

                                                bounds.extend(new google.maps.LatLng(locations[i].latitude, locations[i].longitude));
                                            }

                                            map.setCenter(bounds.getCenter());
                                            map.fitBounds(bounds);
                                            map.setZoom(map.getZoom() - 1);
                                        }

                                    } else {
                                        var map = new google.maps.Map(document.getElementById(map_id), {
                                            center: {lat: -34.397, lng: 150.644},
                                            draggable: false,
                                            zoomControl: false,
                                            scrollwheel: false,
                                            disableDoubleClickZoom: true,
                                            zoom: 8
                                        });
                                    }
                                }
                            }());
                        }
                    }, 0);
            });
        }
    }
}]);

dfxGControls.directive('dfxGcWebIconbar', ['$mdMenu', '$timeout', '$compile', '$filter', function($mdMenu, $timeout, $compile, $filter) {
    return {
        restrict: 'A',
        require: '^dfxGcWebBase',
        scope: true,
        templateUrl: function( el, attrs ) {
            if (angular.isDefined(attrs.dfxGcEdit)) {
                return '/gcontrols/web/iconbar_edit.html';
            } else if (angular.isDefined(attrs.dfxGcDesign)) {
                return '/gcontrols/web/iconbar_design.html';
            } else {
                return '/gcontrols/web/iconbar.html';
            }
        },
        link: function(scope, element, attrs, basectrl) {
            var component = scope.getComponent(element);
            scope.$gcscope = scope;
            basectrl.init(scope, element, component, attrs, 'iconbar').then(function(){
                scope.attributes.dynamicPresent = { "value": false };
                scope.attributes.dynamicPresent.status = "overridden";
                if (scope.attributes.dynamic.value.length>0){scope.attributes.dynamic.status = "overridden";}
                scope.attributes.layoutType = { "value": "none" };
                scope.attributes.statable = true;
                if (!angular.isDefined(attrs.dfxGcDesign) && !angular.isDefined(attrs.dfxGcEdit)) {
                    if(scope.attributes.dynamicPresent.value){
                        scope.dynamicItems = eval('scope.' + scope.attributes.dynamic.value);
                        try{
                            if(scope.dynamicItems.constructor === Array ){
                                if(scope.dynamicItems.length > 0){
                                    scope.attributes.dynamicPresent.value = true;
                                }else{
                                    scope.attributes.dynamicPresent.value = false;
                                }
                            }else{
                                scope.attributes.dynamicPresent.value = false;
                            }
                        }catch(e){
                            scope.attributes.dynamicPresent.value = false;
                        }

                    }else{
                        scope.attributes.dynamicPresent.value = false;
                    }
                }
                if ( !scope.attributes.hasOwnProperty('rootMenu') ) {
                    scope.attributes.rootMenu = {
                        "button": { "style": scope.attributes.buttonStyle.value, "class": "" },
                        "icon": { "size": 24, "style": scope.attributes.iconStyle.value, "class": "" }
                    }
                    scope.attributes.singleMenu = {
                        "button": { "style": "", "class": "" },
                        "icon": { "size": 16, "style": "", "class": "" }
                    }
                    delete scope.attributes.buttonStyle;
                    delete scope.attributes.iconStyle;
                }
                var rootMenuItem = '<button ng-click="{{itemClick}}" ng-show="{{itemDisplay}}" ng-disabled="{{itemDisabled}}" menu-index="{{itemIndex}}" aria-label="md-icon-button" style="{{attributes.rootMenu.button.style}}" class="dfx-core-gc-iconbar-button md-icon-button {{attributes.rootMenu.button.class}}">'+
                    '<md-icon ng-if="{{ifFaIcon}}" class="fa {{faIcon}} {{attributes.rootMenu.icon.class}}" style="font-size:{{attributes.rootMenu.icon.size}}px; {{attributes.rootMenu.icon.style}}"></md-icon>'+
                    '<ng-md-icon ng-if="{{ifSvgIcon}}" icon="{{svgIcon}}" size="{{attributes.rootMenu.icon.size}}" style="{{attributes.rootMenu.icon.style}}" class="{{attributes.rootMenu.icon.class}}"></ng-md-icon>'+
                    '<md-icon ng-if="{{ifStateFaIcon}}" class="fa {{stateFaIcon}} {{attributes.rootMenu.icon.class}} {{stateFaIconClass}}" style="font-size:{{attributes.rootMenu.icon.size}}px; {{attributes.rootMenu.icon.style}} {{stateFaIconStyle}}"></md-icon>'+
                    '<ng-md-icon ng-if="{{ifStateSvgIcon}}" icon="{{stateSvgIcon}}" size="{{attributes.rootMenu.icon.size}}" style="{{attributes.rootMenu.icon.style}} {{stateSvgIconStyle}}" class="{{attributes.rootMenu.icon.class}} {{stateSvgIconClass}}"></ng-md-icon>'+
                    '</button>',
                singleMenuItem = '<md-button ng-show="{{itemDisplay}}" ng-disabled="{{itemDisabled}}" ng-click="{{itemClick}}" menu-index="{{itemIndex}}" class="dfx-menu-button {{attributes.singleMenu.button.class}}" aria-label="iconbar-button" style="{{attributes.singleMenu.button.style}}">'+
                    '<md-icon ng-if="{{ifFaIcon}}" class="fa {{faIcon}} dfx-menu-button-icon {{attributes.singleMenu.icon.class}}" style="font-size:{{attributes.singleMenu.icon.size}}px; {{attributes.singleMenu.icon.style}}"></md-icon>'+
                    '<ng-md-icon ng-if="{{ifSvgIcon}}" icon="{{svgIcon}}" size="{{attributes.singleMenu.icon.size}}" class="dfx-menu-button-icon {{attributes.singleMenu.icon.class}}" style="{{attributes.singleMenu.icon.style}}"></ng-md-icon>'+
                    '<i><md-icon ng-if="{{ifStateFaIcon}}" class="fa {{stateFaIcon}} dfx-menu-button-icon {{attributes.singleMenu.icon.class}} {{stateFaIconClass}}" style="font-size:{{attributes.singleMenu.icon.size}}px; {{attributes.singleMenu.icon.style}} {{stateFaIconStyle}}"></md-icon>'+
                    '<ng-md-icon ng-if="{{ifStateSvgIcon}}" icon="{{stateSvgIcon}}" size="{{attributes.singleMenu.icon.size}}" class="dfx-menu-button-icon {{attributes.singleMenu.icon.class}} {{stateSvgIconClass}}" style="{{attributes.singleMenu.icon.style}} {{stateSvgIconStyle}}"></ng-md-icon></i>'+
                    '<span>{{itemLabel}}</span>'+
                    '<span class="md-alt-text">{{itemShortcut}}</span>'+
                    '<small ng-if="{{ifItemNotification}}">{{itemNotification}}</small>'+
                    '</md-button>',
                iconbarMenuItem =   '<md-menu-item ng-if="{{itemDisplay}}">';
                scope.changeState = function( itemIndexes, ev ) {
                    var levels = JSON.parse('['+itemIndexes+']');
                    var bridge = '.menuItems.value', stateElement = '';
                    for ( var i = 0; i < levels.length; i++ ) {
                        stateElement = stateElement + bridge + '['+ levels[i] + ']';
                    }
                    var stateObject = eval('scope.attributes'+stateElement).state;
                    if (!angular.isDefined(attrs.dfxGcEdit) && !angular.isDefined(attrs.dfxGcDesign) && stateObject.binding !== '') {
                        if ( stateObject.binding === 'true' || stateObject.binding === 'false' ) {
                            switch ( stateObject.binding ) {
                                case 'true': stateObject.icon = stateObject.uncheckedIcon; stateObject.binding = 'false'; break;
                                case 'false': stateObject.icon = stateObject.checkedIcon; stateObject.binding = 'true'; break;
                            }
                            $timeout(function(){
                                var clickedSatateIcon = '', clickedEl;
                                if ( $(ev.target).is("button") ) { clickedEl = $(ev.target); }
                                else if ( $(ev.target).parent().is("button") ) { clickedEl = $(ev.target).parent(); }
                                else if ( $(ev.target).parent().parent().is("button") ) { clickedEl = $(ev.target).parent().parent(); }
                                if ( stateObject.icon.type === 'svg-icon' ) {
                                    clickedSatateIcon = '<ng-md-icon icon="{{'+stateObject.icon.value+'}}" size="16" class="dfx-menu-button-icon '+stateObject.icon.class+'" style="'+stateObject.icon.style+'"></ng-md-icon>';
                                } else {
                                    clickedSatateIcon = '<md-icon class="fa {{'+stateObject.icon.value+'}} dfx-menu-button-icon '+stateObject.icon.class+'" style="'+stateObject.icon.style+'"></md-icon>';
                                }
                                if ( stateObject.icon.value.length>0 ) {
                                    $(clickedEl).find('i').empty().html(clickedSatateIcon);
                                    $compile($(clickedEl).find('i').contents())(scope);
                                } else {
                                    $(clickedEl).find('i').empty();
                                }
                            }, 0);
                        } else {
                            if ( scope.$gcscope[stateObject.binding] === 'true' || scope.$gcscope[stateObject.binding] === 'false' ) {
                                switch ( scope.$gcscope[stateObject.binding] ) {
                                    case 'true': stateObject.icon = stateObject.uncheckedIcon; scope.$gcscope[stateObject.binding] = 'false'; break;
                                    case 'false': stateObject.icon = stateObject.checkedIcon; scope.$gcscope[stateObject.binding] = 'true'; break;
                                }
                            } else if ( scope.$gcscope[stateObject.binding] ) {
                                stateObject.icon = stateObject.uncheckedIcon; scope.$gcscope[stateObject.binding] = false;
                            } else if ( !scope.$gcscope[stateObject.binding] ) {
                                stateObject.icon = stateObject.checkedIcon; scope.$gcscope[stateObject.binding] = true;
                            }
                        }
                    }
                }
                var setState = function( stateObject ) {
                    if (!angular.isDefined(attrs.dfxGcEdit) && !angular.isDefined(attrs.dfxGcDesign)) {
                        if ( stateObject.binding === 'true' || stateObject.binding === 'false' ) {
                            switch ( stateObject.binding ) {
                                case 'true': stateObject.icon = stateObject.checkedIcon; break;
                                case 'false': stateObject.icon = stateObject.uncheckedIcon; break;
                            }
                        } else {
                            if ( scope.$gcscope[stateObject.binding] === 'true' || scope.$gcscope[stateObject.binding] === 'false' ) {
                                switch ( scope.$gcscope[stateObject.binding] ) {
                                    case 'true': stateObject.icon = stateObject.checkedIcon; break;
                                    case 'false': stateObject.icon = stateObject.uncheckedIcon; break;
                                }
                            } else if ( scope.$gcscope[stateObject.binding] ) { stateObject.icon = stateObject.checkedIcon;
                            } else if ( !scope.$gcscope[stateObject.binding] ) { stateObject.icon = stateObject.uncheckedIcon;
                            }
                        }
                    } else {
                        stateObject.icon = stateObject.checkedIcon;
                    }
                }
                var buildNextLevel = function ( nextLevel, road ) {
                    for ( var i = 0; i < nextLevel.length; i++ ) {
                        if ( nextLevel[i].menuItems.value.length > 0 ) {
                            if ( angular.isDefined(attrs.dfxGcEdit) || angular.isDefined(attrs.dfxGcDesign) ) {
                                var iconbarItem = iconbarMenuItem.replace('{{itemDisplay}}', true);
                            } else {
                                var iconbarItem = iconbarMenuItem.replace('{{itemDisplay}}', typeof nextLevel[i].display === 'string' ? nextLevel[i].display.replace(/"/g, '\'') : nextLevel[i].display);
                            }
                            scope.iconBar = scope.iconBar + iconbarItem + '<md-menu>';
                            createDfxMenuItem( nextLevel[i], 'singleMenuItem', road, i );
                            buildNextLevel( nextLevel[i].menuItems.value, road + ',' + i );
                            scope.iconBar = scope.iconBar + '</md-menu-content></md-menu></md-menu-item>';
                        } else {
                            if ( nextLevel[i].divider === true ) {
                                scope.iconBar = scope.iconBar + '<md-menu-divider></md-menu-divider>';
                            } else {
                                if ( angular.isDefined(attrs.dfxGcEdit) || angular.isDefined(attrs.dfxGcDesign) ) {
                                    var iconbarItem = iconbarMenuItem.replace('{{itemDisplay}}', true);
                                } else {
                                    var iconbarItem = iconbarMenuItem.replace('{{itemDisplay}}', typeof nextLevel[i].display === 'string' ? nextLevel[i].display.replace(/"/g, '\'') : nextLevel[i].display);
                                }
                                scope.iconBar = scope.iconBar + iconbarItem;
                                createDfxMenuItem( nextLevel[i], 'singleMenuItem', road, i );
                            }
                        }
                    }
                }
                var createDfxMenuItem = function( dfxMenuItem, type, level, index ) {
                    if ( typeof dfxMenuItem.icon === 'string' ) {
                        var tempIcon = dfxMenuItem.icon;
                        dfxMenuItem.icon = {
                            "value": tempIcon,
                            "type":  dfxMenuItem.hasOwnProperty('iconType') ? dfxMenuItem.iconType : 'fa-icon'
                        }
                    }
                    if ( !dfxMenuItem.hasOwnProperty('state') ) {
                        dfxMenuItem.state = {
                            "value":           false,
                            "binding":         "true",
                            "icon":          { "value": "'thumb_up'", "type": "svg-icon", "style": "", "class": "" },
                            "checkedIcon":   { "value": "'thumb_up'", "type": "svg-icon", "style": "", "class": "" },
                            "uncheckedIcon": { "value": "'thumb_down'", "type": "svg-icon", "style": "", "class": "" }
                        };
                    }
                    if ( dfxMenuItem.state.value ) { setState( dfxMenuItem.state ); }
                    var tempPropObject = {};
                    tempPropObject.ifFaIcon =                   dfxMenuItem.icon.value.length > 0 && dfxMenuItem.icon.type === 'fa-icon' && !dfxMenuItem.state.value ? true : false;
                    tempPropObject.ifSvgIcon =                  dfxMenuItem.icon.value.length > 0 && dfxMenuItem.icon.type === 'svg-icon' && !dfxMenuItem.state.value ? true : false;
                    tempPropObject.ifStateFaIcon =              dfxMenuItem.state.icon.value.length > 0 && dfxMenuItem.state.icon.type === 'fa-icon' && dfxMenuItem.state.value ? true : false;
                    tempPropObject.ifStateSvgIcon =             dfxMenuItem.state.icon.value.length > 0 && dfxMenuItem.state.icon.type === 'svg-icon' && dfxMenuItem.state.value ? true : false;
                    tempPropObject.itemIndex =                  level || level >= 0 ? level + ',' + index : index;
                    tempPropObject.itemDisabled =               dfxMenuItem.disabled;
                    tempPropObject.stateFaIconStyle =           dfxMenuItem.state.icon.style;
                    tempPropObject.stateSvgIconStyle =          dfxMenuItem.state.icon.style;
                    tempPropObject.stateFaIconClass =           dfxMenuItem.state.icon.class;
                    tempPropObject.stateSvgIconClass =          dfxMenuItem.state.icon.class;
                    if ( angular.isDefined(attrs.dfxGcEdit) || angular.isDefined(attrs.dfxGcDesign) ) {
                        tempPropObject.faIcon =                 dfxMenuItem.icon.value.indexOf("'") == -1 ? 'fa-home' : eval(dfxMenuItem.icon.value);
                        tempPropObject.svgIcon =                dfxMenuItem.icon.value.indexOf("'") == -1 ? 'home' : eval(dfxMenuItem.icon.value);
                        tempPropObject.stateFaIcon =            dfxMenuItem.state.icon.value.indexOf("'") == -1 ? 'fa-thumbs-up' : eval(dfxMenuItem.state.icon.value);
                        tempPropObject.stateSvgIcon =           dfxMenuItem.state.icon.value.indexOf("'") == -1 ? 'thumb_up' : eval(dfxMenuItem.state.icon.value);
                        tempPropObject.itemDisplay =            true;
                        if ( type === 'singleMenuItem' ) {
                            tempPropObject.itemLabel =          $filter('checkExpression')(dfxMenuItem.label);
                            tempPropObject.itemShortcut =       dfxMenuItem.shortcut;
                            tempPropObject.ifItemNotification = dfxMenuItem.notification.length > 0 ? true : false;
                            tempPropObject.itemNotification =   dfxMenuItem.notification;
                        }
                    } else {
                        tempPropObject.faIcon =                 dfxMenuItem.icon.value.indexOf("'") == -1 ? '{{'+dfxMenuItem.icon.value+'}}' : eval(dfxMenuItem.icon.value);
                        tempPropObject.svgIcon =                dfxMenuItem.icon.value.indexOf("'") == -1 ? '{{'+dfxMenuItem.icon.value+'}}' : eval(dfxMenuItem.icon.value);
                        tempPropObject.stateFaIcon =            dfxMenuItem.state.icon.value.indexOf("'") == -1 ? '{{'+dfxMenuItem.state.icon.value+'}}' : '{{'+dfxMenuItem.state.icon.value+'}}';
                        tempPropObject.stateSvgIcon =           dfxMenuItem.state.icon.value.indexOf("'") == -1 ? '{{'+dfxMenuItem.state.icon.value+'}}' : '{{'+dfxMenuItem.state.icon.value+'}}';
                        tempPropObject.itemDisplay =            typeof dfxMenuItem.display === 'string' ? dfxMenuItem.display.replace(/"/g, '\'') : dfxMenuItem.display;
                        if ( type === 'singleMenuItem' ) {
                            tempPropObject.itemLabel =          '{{'+dfxMenuItem.label+'}}';
                            tempPropObject.itemShortcut =       dfxMenuItem.shortcut;
                            tempPropObject.ifItemNotification = dfxMenuItem.notification !=='' ? true : false;
                            tempPropObject.itemNotification =   '{{'+dfxMenuItem.notification+'}}';
                        }
                    }
                    if ( dfxMenuItem.menuItems.value.length > 0 ) {
                        tempPropObject.itemClick = dfxMenuItem.state.value ? '$mdOpenMenu();changeState('+"'"+tempPropObject.itemIndex+"'"+', $event);'+dfxMenuItem.onclick : '$mdOpenMenu();'+dfxMenuItem.onclick;
                    } else {
                        tempPropObject.itemClick = dfxMenuItem.state.value ? 'changeState('+"'"+tempPropObject.itemIndex+"'"+', $event);'+dfxMenuItem.onclick : dfxMenuItem.onclick;
                    }
                    var tempMenu = '';
                    if ( type === 'singleMenuItem' ) {
                        tempMenu = singleMenuItem
                            .replace('{{ifFaIcon}}',           tempPropObject.ifFaIcon )
                            .replace('{{ifSvgIcon}}',          tempPropObject.ifSvgIcon )
                            .replace('{{ifStateFaIcon}}',      tempPropObject.ifStateFaIcon )
                            .replace('{{ifStateSvgIcon}}',     tempPropObject.ifStateSvgIcon )
                            .replace('{{faIcon}}',             tempPropObject.faIcon )
                            .replace('{{svgIcon}}',            tempPropObject.svgIcon )
                            .replace('{{stateFaIcon}}',        tempPropObject.stateFaIcon )
                            .replace('{{stateSvgIcon}}',       tempPropObject.stateSvgIcon )
                            .replace('{{stateFaIconStyle}}',   tempPropObject.stateFaIconStyle )
                            .replace('{{stateSvgIconStyle}}',  tempPropObject.stateSvgIconStyle )
                            .replace('{{stateFaIconClass}}',   tempPropObject.stateFaIconClass )
                            .replace('{{stateSvgIconClass}}',  tempPropObject.stateSvgIconClass )
                            .replace('{{itemLabel}}',          tempPropObject.itemLabel )
                            .replace('{{itemShortcut}}',       tempPropObject.itemShortcut )
                            .replace('{{ifItemNotification}}', tempPropObject.ifItemNotification )
                            .replace('{{itemNotification}}',   tempPropObject.itemNotification )
                            .replace('{{itemIndex}}',          tempPropObject.itemIndex )
                            .replace('{{itemDisplay}}',        tempPropObject.itemDisplay )
                            .replace('{{itemDisabled}}',       tempPropObject.itemDisabled )
                            .replace('{{itemClick}}',          tempPropObject.itemClick );
                    } else {
                        tempMenu = rootMenuItem
                            .replace('{{ifFaIcon}}',           tempPropObject.ifFaIcon )
                            .replace('{{ifSvgIcon}}',          tempPropObject.ifSvgIcon )
                            .replace('{{ifStateFaIcon}}',      tempPropObject.ifStateFaIcon )
                            .replace('{{ifStateSvgIcon}}',     tempPropObject.ifStateSvgIcon )
                            .replace('{{faIcon}}',             tempPropObject.faIcon )
                            .replace('{{svgIcon}}',            tempPropObject.svgIcon )
                            .replace('{{stateFaIcon}}',        tempPropObject.stateFaIcon )
                            .replace('{{stateSvgIcon}}',       tempPropObject.stateSvgIcon )
                            .replace('{{stateFaIconStyle}}',   tempPropObject.stateFaIconStyle )
                            .replace('{{stateSvgIconStyle}}',  tempPropObject.stateSvgIconStyle )
                            .replace('{{stateFaIconClass}}',   tempPropObject.stateFaIconClass )
                            .replace('{{stateSvgIconClass}}',  tempPropObject.stateSvgIconClass )
                            .replace('{{itemIndex}}',          tempPropObject.itemIndex )
                            .replace('{{itemDisplay}}',        tempPropObject.itemDisplay )
                            .replace('{{itemDisabled}}',       tempPropObject.itemDisabled )
                            .replace('{{itemClick}}',          tempPropObject.itemClick );
                    }
                    if ( dfxMenuItem.menuItems.value.length > 0 ) {
                        scope.iconBar = scope.iconBar + tempMenu +'<md-menu-content width="4">';
                    } else {
                        if ( type === 'singleMenuItem' ) {
                            scope.iconBar = scope.iconBar + tempMenu + '</md-menu-item>';
                        } else {
                            scope.iconBar = scope.iconBar + tempMenu + '<md-menu-content width="4"></md-menu-content>';
                        }
                    }
                }
                scope.iconbarBuilder = function() {
                    if ( !angular.isDefined(attrs.dfxGcEdit) && !angular.isDefined(attrs.dfxGcDesign) ) {
                        if ( scope.attributes.dynamicPresent.value ){
                            scope.iconbarArray = scope.dynamicItems;
                            scope.attributes.menuItems.value = scope.iconbarArray;
                        } else {
                            scope.iconbarArray = scope.attributes.menuItems.value;
                            scope.attributes.menuItems.value = scope.iconbarArray;
                        }
                    } else {
                        scope.iconbarArray = scope.attributes.menuItems.value;
                    }
                    scope.iconBar = '<md-menu-bar>';
                    for ( var item = 0; item < scope.iconbarArray.length; item++ ) {
                        scope.iconBar = scope.iconBar + '<md-menu>';
                        if ( scope.iconbarArray[item].menuItems.value.length > 0 ) {
                            createDfxMenuItem( scope.iconbarArray[item], 'rootMenuItem', undefined, item );
                            buildNextLevel( scope.iconbarArray[item].menuItems.value, item);
                            scope.iconBar = scope.iconBar + '</md-menu-content>';
                        } else {
                            createDfxMenuItem( scope.iconbarArray[item], 'rootMenuItem', undefined, item );
                        }
                        scope.iconBar = scope.iconBar + '</md-menu>';
                    };
                    scope.iconBar = scope.iconBar + '</md-menu-bar>';
                    scope.iconBarMenu = scope.iconBar;
                    $timeout(function() {
                        $('#' + component.id + '_menu_bar').html(scope.iconBarMenu);
                        $compile($('#' + component.id + '_menu_bar').contents())(scope);
                    }, 0);
                }
                scope.$watch('attributes.menuItems.value', function(newVal, oldVal) {
                    if ( newVal != null && !angular.equals(newVal, oldVal) ) {
                        $timeout(function() {
                            scope.iconbarBuilder();
                        }, 0);
                    }
                }, true);
                scope.$watch("attributes.dynamic.value", function(newValue){
                    $timeout(function(){
                        if (scope.attributes.dynamicPresent==null) {
                            scope.attributes.dynamicPresent = { "value": "" };
                            scope.attributes.dynamic = { "value": "" };
                        }
                        if (typeof newValue !== "undefined" && newValue !== null && newValue !== "") {
                            scope.attributes.dynamicPresent.value = true;
                        } else {
                            scope.attributes.dynamicPresent.value = false;
                        }
                    }, 0);
                });
                scope.iconbarBuilder();
            });
        }
    }
}]);

dfxGControls.directive('dfxGcWebFab', ['$timeout', function($timeout) {
    return {
        restrict: 'A',
        require: '^dfxGcWebBase',
        scope: true,
        templateUrl: function( el, attrs ) {
            if (angular.isDefined(attrs.dfxGcEdit)) {
                return '/gcontrols/web/fab_edit.html';
            } else if (angular.isDefined(attrs.dfxGcDesign)) {
                return '/gcontrols/web/fab_design.html';
            } else {
                return '/gcontrols/web/fab.html';
            }
        },
        link: {
            pre : function(scope, element, attrs, basectrl) {
                var component = scope.getComponent(element);
                scope.component_id = component.id;
                scope.attributes = null;
                basectrl.init(scope, element, component, attrs, 'fab').then(function() {
                    scope.attributes.dynamicPresent.status = "overridden";
                    scope.attributes.dynamic.status = "overridden";
                    scope.attributes.icon.status = "overridden";
                    if (!angular.isDefined(attrs.dfxGcDesign) && !angular.isDefined(attrs.dfxGcEdit)) {
                        if(scope.attributes.dynamicPresent.value){
                            scope.dynamicItems = eval('scope.' + scope.attributes.dynamic.value);
                            try{
                                if(scope.dynamicItems.constructor === Array ){
                                    if(scope.dynamicItems.length > 0){
                                        scope.attributes.dynamicPresent.value = true;
                                    }else{
                                        scope.attributes.dynamicPresent.value = false;
                                    }
                                }else{
                                    scope.attributes.dynamicPresent.value = false;
                                }
                            }catch(e){
                                scope.attributes.dynamicPresent.value = false;
                            }
                        }else{
                            scope.attributes.dynamicPresent.value = false;
                        }
                    }
                    scope.cleanFabClasses = function( fab ){
                        if ( fab.class.indexOf('md-fab') > -1 ) { fab.class = fab.class.replace('md-fab', ""); }
                        if ( fab.class.indexOf('md-raised') > -1 ) { fab.class = fab.class.replace('md-raised', ""); }
                        if ( fab.class.indexOf('md-mini') > -1 ) { fab.class = fab.class.replace('md-mini', ""); }
                    }
                    scope.cleanFabClasses(scope.attributes.triggerButton);
                    scope.cleanFabClasses(scope.attributes.actionButton);
                    if ( !scope.attributes.hasOwnProperty('label') ) {scope.attributes.label = {"value":""}}
                    if ( !scope.attributes.triggerButton.hasOwnProperty('tooltip') ) {scope.attributes.triggerButton.tooltip = { "direction": "top", "style": "", "classes": "" }}
                    if ( !scope.attributes.actionButton.hasOwnProperty('tooltip') ) {scope.attributes.actionButton.tooltip = { "direction": "top", "style": "", "classes": "" }}
                    if ( !scope.attributes.icon.hasOwnProperty('size') ) { scope.attributes.icon.size = 24; }
                    if ( !scope.attributes.actionButton.icon.hasOwnProperty('size') ) { scope.attributes.actionButton.icon.size = 20; }
                    if ( !scope.attributes.icon.hasOwnProperty('type') ) { scope.attributes.icon.type = 'fa-icon'; }
                    scope.ifShowIconTypes = function( icon ) {
                        var regexp = /(^\')(.*)(\'$)/gm, filtered = regexp.exec( icon );
                        if ( icon && ( icon.indexOf('+') >= 0 ) ) { filtered = false; }
                        if ( icon === '' ) { filtered = true; }
                        if ( icon.indexOf("'") === 0 && icon.indexOf('+') === -1 && icon.charAt(icon.length-1) === "'" ) {
                            icon.indexOf("'fa-") === 0 ? scope.attributes.icon.type = 'fa-icon' : scope.attributes.icon.type = 'svg-icon';
                        }
                        scope.showIconTypes = filtered ? false : true;
                    }
                    scope.ifShowIconTypes(scope.attributes.icon.value);
                    scope.checkIconType = function( menuList ) {
                        for (var i = 0; i < menuList.length; i++) {
                            if ( typeof menuList[i].icon === 'string' ) {
                                var tempIcon = menuList[i].icon;
                                menuList[i].icon = {
                                    "value": tempIcon,
                                    "type": menuList[i].hasOwnProperty('iconType') ? menuList[i].iconType : 'fa-icon'
                                }
                            }
                        }
                    }
                    scope.checkIconType( scope.attributes.menuItems.value );
                    if (!angular.isDefined(attrs.dfxGcEdit) && !angular.isDefined(attrs.dfxGcDesign)) {
                        if(scope.attributes.dynamicPresent.value){
                            scope.attributes.menuItems.value = scope.dynamicItems;
                        }
                    }
                    scope.hideTooltip = function () {
                        $('body md-tooltip').remove();
                    }
                    scope.hideTooltip();
                    scope.$watch("attributes.dynamic.value", function(newValue){
                        $timeout(function(){
                            if (scope.attributes.dynamicPresent==null) {
                                scope.attributes.dynamicPresent = { "value": "" };
                                scope.attributes.dynamic = { "value": "" };
                            }
                            if(typeof newValue !== "undefined" && newValue !== null && newValue !== ""){
                                scope.attributes.dynamicPresent.value = true;

                            }else{
                                scope.attributes.dynamicPresent.value = false;
                            }
                        }, 0);
                    });
                });
            }
        }
    }
}]);

dfxGControls.directive('dfxGcWebTreemenu', ['$timeout', '$compile', function($timeout, $compile) {
    return {
        restrict: 'A',
        require: '^dfxGcWebBase',
        scope: true,
        templateUrl: function( el, attrs ) {
            if (angular.isDefined(attrs.dfxGcEdit)) {
                return '/gcontrols/web/treemenu_edit.html';
            } else if (angular.isDefined(attrs.dfxGcDesign)) {
                return '/gcontrols/web/treemenu_design.html';
            } else {
                return '/gcontrols/web/treemenu.html';
            }
        },
        link: function(scope, element, attrs, basectrl) {
            var component = scope.getComponent(element),
                PADDING = 16;
            basectrl.init(scope, element, component, attrs, 'treemenu').then(function() {
                element.addClass('flex-100');
                scope.attributes.menuItems.status = "overridden";
                scope.attributes.dynamicPresent.status = "overridden";
                scope.attributes.dynamic.status = "overridden";
                scope.menuToggle = function(ev) {
                    var clickedItem = ev.target,
                        treeButton = $(clickedItem);
                        clickedItemPadding = parseFloat($(clickedItem).css('padding-left')),
                        subMenu = $(clickedItem).parent().siblings(),
                        treeItem = $(clickedItem).parent();
                    treeButton.toggleClass('opened');
                    subMenu.toggleClass('opened');
                    subMenu.slideToggle();
                    if (!angular.isDefined(attrs.dfxGcDesign) && !angular.isDefined(attrs.dfxGcEdit)) {
                        if ( subMenu.hasClass('opened') ) {
                            subMenu.children().find('md-menu-item > button, md-menu-item > div').css('padding-left', clickedItemPadding + PADDING);
                        } else {
                            treeItem.parent().find('ul.opened').slideUp();
                            treeItem.parent().find('.opened').removeClass('opened');
                            subMenu.children().find('md-menu-item > button, md-menu-item > div').css('padding-left', clickedItemPadding);
                        }
                    } else {
                        if ( !subMenu.hasClass('opened') ) {
                            treeItem.parent().find('ul.opened').slideUp();
                            treeItem.parent().find('.opened').removeClass('opened');
                        }
                    }
                };
                $timeout(function() {
                    var btns = $('#' + component.id).find('button, div');
                    btns.each(function(index, element) {
                        if ( $(element).parents('.tree-menu-item').length > 1 ) {
                            if (!angular.isDefined(attrs.dfxGcDesign) && !angular.isDefined(attrs.dfxGcEdit)) {
                                var buttonPadding = PADDING * $(element).parents('.tree-menu-item').length - PADDING + 'px';
                                $(element).css('padding-left', buttonPadding);
                            } else {
                                var buttonPadding = PADDING * $(element).parents('.tree-menu-item').length + 'px';
                                $(element).css('padding-left', buttonPadding);
                            }
                        }
                    });
                }, 0);
                scope.checkIconType = function( menuList ) {
                    for (var i = 0; i < menuList.length; i++) {
                        if ( menuList[i].menuItems.value.length > 0 ) {
                            scope.checkIconType( menuList[i].menuItems.value );
                        }
                        if ( typeof menuList[i].icon === 'string' ) {
                            var tempIcon = menuList[i].icon;
                            menuList[i].icon = {
                                "value": tempIcon,
                                "type": menuList[i].hasOwnProperty('iconType') ? menuList[i].iconType : 'fa-icon'
                            }
                        }
                    }
                }
                if ( !angular.isDefined(attrs.dfxGcDesign) && !angular.isDefined(attrs.dfxGcEdit) ) {
                    if ( scope.attributes.dynamicPresent.value ){
                        scope.dynamicItems = eval('scope.' + scope.attributes.dynamic.value);
                        if ( scope.dynamicItems.length > 0 ) {
                            scope.checkIconType( scope.dynamicItems );
                        }
                        try{
                            if ( scope.dynamicItems.constructor === Array ){
                                if ( scope.dynamicItems.length > 0 ) {
                                    scope.attributes.dynamicPresent.value = true;
                                } else {
                                    scope.attributes.dynamicPresent.value = false;
                                }
                            } else {
                                scope.attributes.dynamicPresent.value = false;
                            }
                        } catch(e) {
                            scope.attributes.dynamicPresent.value = false;
                        }
                    } else {
                        scope.attributes.dynamicPresent.value = false;
                    }
                }
                if ( !angular.isDefined(attrs.dfxGcEdit) && !angular.isDefined(attrs.dfxGcDesign) ) {
                    if ( scope.attributes.dynamicPresent.value ){
                        scope.attributes.menuItems.value = scope.dynamicItems;
                    }
                }
                scope.$watch("attributes.dynamic.value", function(newValue){
                    $timeout(function(){
                        if (scope.attributes.dynamicPresent==null) {
                            scope.attributes.dynamicPresent = { "value": "" };
                            scope.attributes.dynamic = { "value": "" };
                        }
                        if ( typeof newValue !== "undefined" && newValue !== null && newValue !== "" ){
                            scope.attributes.dynamicPresent.value = true;

                        } else {
                            scope.attributes.dynamicPresent.value = false;
                        }
                    }, 0);
                });
            });
        }
    }
}]);

dfxGControls.directive('dfxGcWebHorizontalmenu', ['$mdMenu', '$timeout', '$compile', '$filter', function($mdMenu, $timeout, $compile, $filter) {
    return {
        restrict: 'A',
        require: '^dfxGcWebBase',
        scope: true,
        templateUrl: function( el, attrs ) {
            if (angular.isDefined(attrs.dfxGcEdit)) {
                return '/gcontrols/web/horizontalmenu_edit.html';
            } else if (angular.isDefined(attrs.dfxGcDesign)) {
                return '/gcontrols/web/horizontalmenu_design.html';
            } else {
                return '/gcontrols/web/horizontalmenu.html';
            }
        },
        link: function(scope, element, attrs, basectrl) {
            var component = scope.getComponent(element);
            scope.$gcscope = scope;
            basectrl.init(scope, element, component, attrs, 'horizontalmenu').then(function(){
                scope.attributes.flex.status = "overridden";
                scope.attributes.dynamicPresent.status = "overridden";
                scope.attributes.dynamic.status = "overridden";
                if (!angular.isDefined(attrs.dfxGcDesign) && !angular.isDefined(attrs.dfxGcEdit)) {
                    if(scope.attributes.dynamicPresent.value){
                        scope.dynamicItems = eval('scope.' + scope.attributes.dynamic.value);
                        try{
                            if(scope.dynamicItems.constructor === Array ){
                                if(scope.dynamicItems.length > 0){
                                    scope.attributes.dynamicPresent.value = true;
                                }else{
                                    scope.attributes.dynamicPresent.value = false;
                                }
                            }else{
                                scope.attributes.dynamicPresent.value = false;
                            }
                        }catch(e){
                            scope.attributes.dynamicPresent.value = false;
                        }

                    }else{
                        scope.attributes.dynamicPresent.value = false;
                    }
                }
                var rootMenuItem = '<button ng-click="{{itemClick}}" ng-show="{{itemDisplay}}" ng-disabled="{{itemDisabled}}" aria-label="button" class="dfx-horizontalmenu-root-button">'+
                        '<md-icon ng-if="{{ifFaIcon}}" class="fa {{faIcon}} dfx-horizontalmenu-root-icon"></md-icon>'+
                        '<ng-md-icon ng-if="{{ifSvgIcon}}" icon="{{svgIcon}}" size="16" class="dfx-horizontalmenu-root-icon"></ng-md-icon>'+
                        '<span>{{itemLabel}}</span>'+
                        '<span ng-if="{{ifItemShortcut}}" style="margin:0 8px;">{{itemShortcut}}</span>'+
                        '<small ng-if="{{ifItemNotification}}">{{itemNotification}}</small>'+
                        '</button>',
                    singleMenuItem =    '<md-button ng-show="{{itemDisplay}}" ng-disabled="{{itemDisabled}}" ng-click="{{itemClick}}" aria-label="iconbar-button" class="dfx-horizontalmenu-button dfx-menu-button">'+
                        '<md-icon ng-if="{{ifFaIcon}}" class="fa {{faIcon}} dfx-menu-button-icon"></md-icon>'+
                        '<ng-md-icon ng-if="{{ifSvgIcon}}" icon="{{svgIcon}}" size="16" class="dfx-menu-button-icon"></ng-md-icon>'+
                        '<span>{{itemLabel}}</span>'+
                        '<span ng-if="{{ifItemShortcut}}" class="md-alt-text">{{itemShortcut}}</span>'+
                        '<small ng-if="{{ifItemNotification}}">{{itemNotification}}</small>'+
                        '</md-button>',
                    iconbarMenuItem =   '<md-menu-item ng-if="{{itemDisplay}}">';

                var buildNextLevel = function (nextLevel) {
                    for (var i = 0; i < nextLevel.length; i++) {
                        if ( nextLevel[i].menuItems.value.length > 0 ) {
                            next = nextLevel[i].menuItems.value;
                            if (angular.isDefined(attrs.dfxGcEdit) || angular.isDefined(attrs.dfxGcDesign)) {
                                var iconbarItem = iconbarMenuItem.replace('{{itemDisplay}}', true);
                            } else {
                                var iconbarItem = iconbarMenuItem.replace('{{itemDisplay}}', typeof nextLevel[i].display === 'string' ? nextLevel[i].display.replace(/"/g, '\'') : nextLevel[i].display);
                            }
                            scope.iconBar = scope.iconBar + iconbarItem + '<md-menu>';
                            createDfxMenuItem( nextLevel[i], 'singleMenuItem');
                            buildNextLevel( nextLevel[i].menuItems.value );
                            scope.iconBar = scope.iconBar + '</md-menu-content></md-menu></md-menu-item>';
                        } else {
                            if ( nextLevel[i].divider === true ) {
                                scope.iconBar = scope.iconBar + '<md-menu-divider></md-menu-divider>';
                            } else {
                                if (angular.isDefined(attrs.dfxGcEdit) || angular.isDefined(attrs.dfxGcDesign)) {
                                    var iconbarItem = iconbarMenuItem.replace('{{itemDisplay}}', true);
                                } else {
                                    var iconbarItem = iconbarMenuItem.replace('{{itemDisplay}}', typeof nextLevel[i].display === 'string' ? nextLevel[i].display.replace(/"/g, '\'') : nextLevel[i].display);
                                }
                                scope.iconBar = scope.iconBar + iconbarItem;
                                createDfxMenuItem( nextLevel[i], 'singleMenuItem' );
                            }
                        }
                    }
                }
                var createDfxMenuItem = function( dfxMenuItem, type ) {
                    if ( typeof dfxMenuItem.icon === 'string' ) {
                        var tempIcon = dfxMenuItem.icon;
                        dfxMenuItem.icon = {
                            "value": tempIcon,
                            "type":  dfxMenuItem.hasOwnProperty('iconType') ? dfxMenuItem.iconType : 'fa-icon'
                        }
                    }
                    var tempPropObject = {};
                    tempPropObject.ifFaIcon =                   dfxMenuItem.icon.value.length > 0 && dfxMenuItem.icon.type === 'fa-icon' ? true : false;
                    tempPropObject.ifSvgIcon =                  dfxMenuItem.icon.value.length > 0 && dfxMenuItem.icon.type === 'svg-icon' ? true : false;
                    tempPropObject.ifItemShortcut =             dfxMenuItem.shortcut.length > 0 ? true : false;
                    tempPropObject.itemShortcut =               dfxMenuItem.shortcut;
                    tempPropObject.ifItemNotification =         dfxMenuItem.notification.length > 0 ? true : false;
                    tempPropObject.itemDisabled =               dfxMenuItem.disabled;
                    tempPropObject.itemClick =                  dfxMenuItem.menuItems.value.length > 0 ? '$mdOpenMenu();'+dfxMenuItem.onclick : dfxMenuItem.onclick;
                    if ( angular.isDefined(attrs.dfxGcEdit) || angular.isDefined(attrs.dfxGcDesign) ) {
                        tempPropObject.faIcon =                 dfxMenuItem.icon.value.indexOf("'") == -1 ? 'fa-home' : eval(dfxMenuItem.icon.value);
                        tempPropObject.svgIcon =                dfxMenuItem.icon.value.indexOf("'") == -1 ? 'home' : eval(dfxMenuItem.icon.value);
                        tempPropObject.itemLabel =              $filter('checkExpression')(dfxMenuItem.label);
                        tempPropObject.itemNotification =       dfxMenuItem.notification;
                        tempPropObject.itemDisplay =            true;
                    } else {
                        tempPropObject.faIcon =                 dfxMenuItem.icon.value.indexOf("'") == -1 ? '{{'+dfxMenuItem.icon.value+'}}' : eval(dfxMenuItem.icon.value);
                        tempPropObject.svgIcon =                dfxMenuItem.icon.value.indexOf("'") == -1 ? '{{'+dfxMenuItem.icon.value+'}}' : eval(dfxMenuItem.icon.value);
                        tempPropObject.itemLabel =              '{{'+dfxMenuItem.label+'}}';
                        tempPropObject.itemNotification =       '{{'+dfxMenuItem.notification+'}}';
                        tempPropObject.itemDisplay =            typeof dfxMenuItem.display === 'string' ? dfxMenuItem.display.replace(/"/g, '\'') : dfxMenuItem.display;
                    }
                    var tempMenu = '';
                    if ( type === 'singleMenuItem' ) {
                        tempMenu = singleMenuItem
                            .replace('{{ifFaIcon}}',           tempPropObject.ifFaIcon )
                            .replace('{{ifSvgIcon}}',          tempPropObject.ifSvgIcon )
                            .replace('{{faIcon}}',             tempPropObject.faIcon )
                            .replace('{{svgIcon}}',            tempPropObject.svgIcon )
                            .replace('{{itemLabel}}',          tempPropObject.itemLabel )
                            .replace('{{ifItemShortcut}}',     tempPropObject.ifItemShortcut )
                            .replace('{{itemShortcut}}',       tempPropObject.itemShortcut )
                            .replace('{{ifItemNotification}}', tempPropObject.ifItemNotification )
                            .replace('{{itemNotification}}',   tempPropObject.itemNotification )
                            .replace('{{itemDisplay}}',        tempPropObject.itemDisplay )
                            .replace('{{itemDisabled}}',       tempPropObject.itemDisabled )
                            .replace('{{itemClick}}',          tempPropObject.itemClick );
                    } else {
                        tempMenu = rootMenuItem
                            .replace('{{ifFaIcon}}',           tempPropObject.ifFaIcon )
                            .replace('{{ifSvgIcon}}',          tempPropObject.ifSvgIcon )
                            .replace('{{faIcon}}',             tempPropObject.faIcon )
                            .replace('{{svgIcon}}',            tempPropObject.svgIcon )
                            .replace('{{itemLabel}}',          tempPropObject.itemLabel )
                            .replace('{{ifItemShortcut}}',     tempPropObject.ifItemShortcut )
                            .replace('{{itemShortcut}}',       tempPropObject.itemShortcut )
                            .replace('{{ifItemNotification}}', tempPropObject.ifItemNotification )
                            .replace('{{itemNotification}}',   tempPropObject.itemNotification )
                            .replace('{{itemDisplay}}',        tempPropObject.itemDisplay )
                            .replace('{{itemDisabled}}',       tempPropObject.itemDisabled )
                            .replace('{{itemClick}}',          tempPropObject.itemClick );
                    }
                    if ( dfxMenuItem.menuItems.value.length > 0 ) {
                        scope.iconBar = scope.iconBar + tempMenu +'<md-menu-content width="4">';
                    } else {
                        if ( type === 'singleMenuItem' ) {
                            scope.iconBar = scope.iconBar + tempMenu + '</md-menu-item>';
                        } else {
                            scope.iconBar = scope.iconBar + tempMenu + '<md-menu-content width="4"></md-menu-content>';
                        }
                    }
                }
                scope.iconbarBuilder = function() {
                    if (!angular.isDefined(attrs.dfxGcEdit) && !angular.isDefined(attrs.dfxGcDesign)) {
                        if(scope.attributes.dynamicPresent.value){
                            scope.iconbarArray = scope.dynamicItems;
                            scope.attributes.menuItems.value = scope.iconbarArray;
                        }else{
                            scope.iconbarArray = scope.attributes.menuItems.value;
                            scope.attributes.menuItems.value = scope.iconbarArray;
                        }
                    }else{
                        scope.iconbarArray = scope.attributes.menuItems.value;
                    }
                    scope.iconBar = '<md-menu-bar>';
                    for (var item = 0; item < scope.iconbarArray.length; item++) {
                        scope.iconBar = scope.iconBar + '<md-menu>';
                        if ( scope.iconbarArray[item].menuItems.value.length > 0 ) {
                            createDfxMenuItem( scope.iconbarArray[item], 'rootMenuItem' );
                            buildNextLevel( scope.iconbarArray[item].menuItems.value, item);
                            scope.iconBar = scope.iconBar + '</md-menu-content>';
                        } else {
                            createDfxMenuItem( scope.iconbarArray[item], 'rootMenuItem' );
                        }
                        scope.iconBar = scope.iconBar + '</md-menu>';
                    };
                    scope.iconBar = scope.iconBar + '</md-menu-bar>';
                    scope.iconBarMenu = scope.iconBar;
                    $timeout(function() {
                        $('#' + component.id + '_menu_bar').html(scope.iconBarMenu);
                        $compile($('#' + component.id + '_menu_bar').contents())(scope);
                    }, 0);
                }

                scope.$watch('attributes.menuItems.value', function(newVal, oldVal) {
                    if ( newVal != null && !angular.equals(newVal, oldVal) ) {
                        $timeout(function() {
                            scope.iconbarBuilder();
                        }, 0);
                    }
                }, true);
                scope.$watch("attributes.dynamic.value", function(newValue){
                    $timeout(function(){
                        if (scope.attributes.dynamicPresent==null) {
                            scope.attributes.dynamicPresent = { "value": "" };
                            scope.attributes.dynamic = { "value": "" };
                        }
                        if(typeof newValue !== "undefined" && newValue !== null && newValue !== ""){
                            scope.attributes.dynamicPresent.value = true;
                        }else{
                            scope.attributes.dynamicPresent.value = false;
                        }
                    }, 0);
                });
                scope.iconbarBuilder();
            });
        }
    }
}]);

dfxGControls.directive('dfxGcWebImage', [ 'dfxGCUtil', '$timeout', function(dfxGCUtil, $timeout) {
    return {
        restrict: 'A',
        require: '^dfxGcWebBase',
        scope: true,
        templateUrl: function( el, attrs ) {
            if (angular.isDefined(attrs.dfxGcEdit)) {
                return '/gcontrols/web/image_edit.html';
            } else if (angular.isDefined(attrs.dfxGcDesign)) {
                return '/gcontrols/web/image_design.html';
            } else {
                return '/gcontrols/web/image.html';
            }
        },
        link: {
            pre : function(scope, element, attrs, basectrl) {
                var component = scope.getComponent(element);
                scope.component_id = component.id;
                scope.attributes = null;

                var replaceImgSrc = function (src, component_id) {
                    // if src value is scope variable
                    if (src.indexOf("'") == -1) {
                        $('#' + component_id).find('img').attr('src', '/images/dfx_image_blank.png');
                    }
                    // if src value is URL within quotes
                    else if (src.indexOf("'") == 0 && src.lastIndexOf("'") == (src.length - 1) && src.length > 2) {
                        var srcWithoutQuotes = src.replace(/'/g, '');
                        $('#' + component_id).find('img').attr('src', srcWithoutQuotes);
                    }
                };

                basectrl.init(scope, element, component, attrs, 'image').then(function() {
                    if (angular.isDefined(attrs.dfxGcEdit) || angular.isDefined(attrs.dfxGcDesign)) { // DESIGN TIME
                        $timeout(function() {
                            replaceImgSrc(scope.attributes.src.value, scope.component_id);
                        }, 0);
                    }
                });

                if (angular.isDefined(attrs.dfxGcEdit) || angular.isDefined(attrs.dfxGcDesign)) { // DESIGN TIME
                    scope.$watch('attributes.src.value', function (newValue) {
                        if (newValue) {
                            replaceImgSrc(newValue, scope.component_id);
                        }
                    });
                }
            }
        }
    }
}]);

dfxGControls.directive('dfxGcWebSlider', ['$timeout', '$mdDialog', function($timeout, $mdDialog) {
    return {
        restrict: 'A',
        require: '^dfxGcWebBase',
        scope: true,
        templateUrl: function( el, attrs ) {
            if (angular.isDefined(attrs.dfxGcEdit)) {
                return '/gcontrols/web/slider_edit.html';
            } else if (angular.isDefined(attrs.dfxGcDesign)) {
                return '/gcontrols/web/slider_design.html';
            } else {
                return '/gcontrols/web/slider.html';
            }
        },
        link: function(scope, element, attrs, basectrl) {
            var component = scope.getComponent(element);
            scope.$gcscope = scope;
            basectrl.init(scope, element, component, attrs, 'slider').then(function(){
                if(!scope.attributes.hasOwnProperty('isBindingPresent')){scope.attributes.isBindingPresent = { "value": "" };}
                if(!scope.attributes.hasOwnProperty('dynamicPresent')){scope.attributes.dynamicPresent = { "value": false };}
                if(!scope.attributes.hasOwnProperty('counterCheck')){scope.attributes.counterCheck = { "value": "" };}
                if(!scope.attributes.hasOwnProperty('selectedIndex')){scope.attributes.selectedIndex = { "value": "" };}
                if ( !scope.attributes.hasOwnProperty('flex') ) { scope.attributes.flex = { "value": 50 }; }
                scope.attributes.binding.status = "overridden";
                scope.attributes.isBindingPresent.status = "overridden";
                scope.attributes.flex.status = "overridden";
                scope.attributes.buttonClass.value = scope.attributes.buttonClass.value.replace("md-primary", "");
                if(!angular.isDefined(attrs.dfxGcDesign) && !angular.isDefined(attrs.dfxGcEdit)) {
                    if(scope.attributes.isBindingPresent.value){
                        if(scope.$gcscope[scope.attributes.binding.value] instanceof Array){
                            for(var i = 0; i < scope.$gcscope[scope.attributes.binding.value].length; i++){
                                if(!isNaN(scope.$gcscope[scope.attributes.binding.value][i][scope.attributes.displayValue.value])){
                                    scope.$gcscope[scope.attributes.binding.value][i][scope.attributes.displayValue.value] = parseInt(scope.$gcscope[scope.attributes.binding.value][i][scope.attributes.displayValue.value]);
                                }else{
                                    /*console.log('Values should be numeric.');*/
                                    break;
                                }
                            }
                        }else{
                            /*console.log('Binding data should be an array.');*/
                        }
                    }
                }

                if(scope.attributes.inputVisible.value === ""){
                    scope.attributes.inputVisible.value = "true";
                    scope.attributes.discrete.value = false;
                    scope.attributes.selectedIndex.value = 0;
                    scope.attributes.counterCheck.value = 1;
                    scope.attributes.isBindingPresent.value = false;
                }

                scope.showOptionsEditor = function(ev) {
                    $mdDialog.show({
                        scope: scope.$new(),
                        parent: angular.element(document.body),
                        targetEvent: ev,
                        clickOutsideToClose:true,
                        ariaLabel: 'options-editor',
                        templateUrl: '/gcontrols/web/slider_options_editor.html',
                        onComplete: function() {
                            $('.menu-structure li').eq(scope.attributes.selectedIndex.value).addClass('active');
                        },
                        controller: function() {
                            scope.closeDialog = function() {
                                $mdDialog.hide();
                            }
                        }
                    });
                }

                scope.addSliderItem = function(){
                    scope.attributes.slidersArray.status = "overridden";
                    scope.attributes.counterCheck.value++;
                    var par = "'parameter " + scope.attributes.counterCheck.value + ": '" ;
                    var temp = Math.floor(Math.random() * (scope.attributes.maxValue.value - scope.attributes.minValue.value)) + scope.attributes.minValue.value;
                    scope.attributes.slidersArray.value.push({"label": par, "value": temp});
                    scope.attributes.selectedIndex.value = scope.attributes.slidersArray.value.length - 1;
                    scope.attributes.currentItem = scope.attributes.slidersArray.value[scope.attributes.selectedIndex.value];
                    $timeout(function() { scope.activeOption(); }, 0);
                };

                scope.attributes.currentItem = scope.attributes.slidersArray.value[scope.attributes.selectedIndex.value];

                scope.activeOption = function() {
                    $('.menu-structure li').removeClass('active');
                    $('.menu-structure li').eq( scope.attributes.selectedIndex.value ).addClass('active');
                }

                scope.selectSliderItem = function( index ) {
                    scope.attributes.slidersArray.status = "overridden";
                    scope.attributes.selectedIndex.value = index;
                    scope.attributes.currentItem = scope.attributes.slidersArray.value[index];
                    scope.activeOption();
                }

                scope.moveOptionUp = function() {
                    if ( scope.attributes.selectedIndex.value > 0 ) {
                        var movedOption = scope.attributes.currentItem,
                            fromIndex = scope.attributes.selectedIndex.value,
                            toIndex = scope.attributes.selectedIndex.value - 1;
                        scope.attributes.slidersArray.value.splice(fromIndex, 1);
                        scope.attributes.slidersArray.value.splice(toIndex, 0, movedOption);
                        --scope.attributes.selectedIndex.value;
                        scope.attributes.currentItem = scope.attributes.slidersArray.value[scope.attributes.selectedIndex.value];
                        scope.activeOption();
                    }
                }

                scope.moveOptionDown = function() {
                    if ( scope.attributes.selectedIndex.value < (scope.attributes.slidersArray.value.length - 1) ) {
                        var movedOption = scope.attributes.currentItem,
                            fromIndex = scope.attributes.selectedIndex.value,
                            toIndex = scope.attributes.selectedIndex.value + 1;
                        scope.attributes.slidersArray.value.splice(fromIndex, 1);
                        scope.attributes.slidersArray.value.splice(toIndex, 0, movedOption);
                        ++scope.attributes.selectedIndex.value;
                        scope.attributes.currentItem = scope.attributes.slidersArray.value[scope.attributes.selectedIndex.value];
                        scope.activeOption();
                    }
                }

                scope.removeSliderItem = function(){
                    scope.attributes.slidersArray.status = "overridden";
                    scope.attributes.selectedIndex.value = parseInt(scope.attributes.selectedIndex.value);
                    if(scope.attributes.slidersArray.value.length > 1){
                        scope.attributes.slidersArray.value.splice(scope.attributes.selectedIndex.value, 1);
                        if ( scope.attributes.selectedIndex.value > 0 ) {
                            scope.attributes.selectedIndex.value--;
                        }
                        scope.attributes.currentItem = scope.attributes.slidersArray.value[scope.attributes.selectedIndex.value];
                        scope.activeOption();
                    }
                }

                scope.$watch('attributes.selectedIndex.value', function(newValue){
                    scope.attributes.selectedIndex.status = "overridden";
                    scope.attributes.selectedIndex.value = parseInt(newValue);
                });

                scope.$watch('attributes.binding.value', function(newValue){
                    if(newValue){
                        scope.attributes.isBindingPresent.value = true;
                    }else{
                        scope.attributes.isBindingPresent.value = false;
                    }
                });

                scope.$watch('attributes.source.value', function(newValue){
                    if(newValue){
                        scope.attributes.dynamicPresent.value = true;
                    }else{
                        scope.attributes.dynamicPresent.value = false;
                    }
                });

                if (!angular.isDefined(attrs.dfxGcDesign) && !angular.isDefined(attrs.dfxGcEdit)) {
                    basectrl.bindScopeVariable(scope, component.attributes.binding.value);
                    basectrl.bindScopeVariable(scope, component.attributes.source.value);
                }

                scope.changeWidth = function(){
                    $('#' + scope.component_id).css('width', scope.attributes.flex.value + '%');
                };
                if (!angular.isDefined(attrs.dfxGcEdit)) {
                    scope.changeWidth();
                }
            });
        }
    }
}]);

dfxGControls.directive('dfxGcWebSelect', ['$timeout', '$mdDialog', function($timeout, $mdDialog) {
    return {
        restrict: 'A',
        require: '^dfxGcWebBase',
        scope: true,
        templateUrl: function( el, attrs ) {
            if (angular.isDefined(attrs.dfxGcEdit)) {
                return '/gcontrols/web/select_edit.html';
            } else if (angular.isDefined(attrs.dfxGcDesign)) {
                return '/gcontrols/web/select_design.html';
            } else {
                return '/gcontrols/web/select.html';
            }
        },
        link: function(scope, element, attrs, basectrl) {
            var component = scope.getComponent(element);
            scope.$gcscope = scope;
            basectrl.init(scope, element, component, attrs, 'select').then(function(){
                if (!scope.attributes.hasOwnProperty('flex')) {scope.attributes.flex = { "value": 20 }; }
                if (!scope.attributes.hasOwnProperty('isBindingPresent')) {scope.attributes.isBindingPresent = { "value": "init" };}
                if (!scope.attributes.hasOwnProperty('dynamicPresent')) {scope.attributes.dynamicPresent = { "value": false };}
                if (!scope.attributes.hasOwnProperty('currentIndex')) {scope.attributes.currentIndex = { "value": 0 };}
                if (!scope.attributes.hasOwnProperty('counterSelectOptions')) {scope.attributes.counterSelectOptions = { "value": "" };}
                if (scope.attributes.hasOwnProperty('isClicked')){delete scope.attributes.isClicked;}

                scope.attributes.flex.status = "overridden";
                scope.attributes.currentIndex.status = "overridden";
                scope.attributes.currentItem.status = "overridden";
                scope.attributes.binding.status = "overridden";
                scope.attributes.options.status = "overridden";
                scope.attributes.counterSelectOptions.status = "overridden";

                if(!angular.isDefined(attrs.dfxGcDesign) && !angular.isDefined(attrs.dfxGcEdit)) {
                    scope.attributes.currentItem = scope.attributes.staticOptions.value[scope.attributes.currentIndex.value];
                    if(scope.$gcscope[scope.attributes.options.source]){
                        scope.attributes.empty.value = scope.$gcscope[scope.attributes.options.source][0][scope.attributes.options.value];
                    }
                }

                if(scope.attributes.counterSelectOptions.value === ""){
                    scope.attributes.isBindingPresent.value = false;
                    scope.attributes.counterSelectOptions.value = 2;
                    scope.attributes.currentItem = scope.attributes.staticOptions.value[0];
                }

                scope.showOptionsEditor = function(ev) {
                    $mdDialog.show({
                        scope: scope.$new(),
                        parent: angular.element(document.body),
                        targetEvent: ev,
                        clickOutsideToClose:true,
                        ariaLabel: 'options-editor',
                        templateUrl: '/gcontrols/web/select_options_editor.html',
                        onComplete: function() {
                            $('.menu-structure li').eq(scope.attributes.currentIndex.value).addClass('active');
                        },
                        controller: function() {
                            scope.closeDialog = function() {
                                $mdDialog.hide();
                            }
                        }
                    });
                }

                scope.activeOption = function() {
                    $('.menu-structure li').removeClass('active');
                    $('.menu-structure li').eq( scope.attributes.currentIndex.value ).addClass('active');
                }

                scope.selectOptionItem = function( index ) {
                    scope.attributes.staticOptions.status = "overridden";
                    scope.attributes.currentIndex.value = index;
                    scope.attributes.currentItem = scope.attributes.staticOptions.value[scope.attributes.currentIndex.value];
                    scope.activeOption();
                }

                scope.addItem = function(){
                    scope.attributes.staticOptions.status = "overridden";
                    ++scope.attributes.counterSelectOptions.value;
                    var optval = "option_value_" + scope.attributes.counterSelectOptions.value;
                    var optdis = "'option display " + scope.attributes.counterSelectOptions.value + "'";
                    scope.attributes.currentIndex.value = scope.attributes.currentIndex.value + 1;
                    scope.attributes.staticOptions.value.splice(scope.attributes.currentIndex.value, 0, {"display":optdis, "value":optval, status: "overridden"});
                    scope.attributes.currentItem = scope.attributes.staticOptions.value[scope.attributes.currentIndex.value];
                    $timeout(function() { scope.activeOption(); }, 0);
                };

                scope.moveOptionUp = function() {
                    if ( scope.attributes.currentIndex.value > 0 ) {
                        var movedOption = scope.attributes.currentItem,
                            fromIndex = scope.attributes.currentIndex.value,
                            toIndex = scope.attributes.currentIndex.value - 1;
                        scope.attributes.staticOptions.value.splice(fromIndex, 1);
                        scope.attributes.staticOptions.value.splice(toIndex, 0, movedOption);
                        --scope.attributes.currentIndex.value;
                        scope.attributes.currentItem = scope.attributes.staticOptions.value[scope.attributes.currentIndex.value];
                        scope.activeOption();
                    }
                }

                scope.moveOptionDown = function() {
                    if ( scope.attributes.currentIndex.value < ( scope.attributes.staticOptions.value.length - 1 )) {
                        var movedOption = scope.attributes.currentItem,
                            fromIndex = scope.attributes.currentIndex.value,
                            toIndex = scope.attributes.currentIndex.value + 1;
                        scope.attributes.staticOptions.value.splice(fromIndex, 1);
                        scope.attributes.staticOptions.value.splice(toIndex, 0, movedOption);
                        ++scope.attributes.currentIndex.value;
                        scope.attributes.currentItem = scope.attributes.staticOptions.value[scope.attributes.currentIndex.value];
                        scope.activeOption();
                    }
                }

                scope.removeOption = function(){
                    scope.attributes.staticOptions.status = "overridden";
                    if(scope.attributes.staticOptions.value.length === 1){
                        /*console.log('The last option can not be deleted');*/
                        scope.attributes.currentIndex.value = 0;
                        scope.attributes.currentItem = scope.attributes.staticOptions.value[0];
                    }else{
                        var temp = scope.attributes.currentIndex.value;
                        scope.attributes.staticOptions.value.splice(temp, 1);
                        if(temp === 0){
                            scope.attributes.currentIndex.value = 0;
                            scope.attributes.currentItem = scope.attributes.staticOptions.value[0];
                        }else{
                            scope.attributes.currentIndex.value = temp - 1;
                            scope.attributes.currentItem = scope.attributes.staticOptions.value[scope.attributes.currentIndex.value];
                        }
                    }
                    scope.activeOption();
                };

                scope.hideWebGcSelectMask = function() {
                    $('body > md-backdrop, body > div.md-scroll-mask, body > div.md-select-menu-container.md-active').fadeOut(250);
                }
                $('body > md-backdrop').on('click', function(){ scope.hideWebGcSelectMask(); });

                scope.$watch('attributes.currentItem', function(newValue, oldValue){
                    for(var i =0; i < scope.attributes.staticOptions.value.length; i++){
                        if(newValue.value === scope.attributes.staticOptions.value[i].value && newValue.display === scope.attributes.staticOptions.value[i].display){
                            scope.attributes.currentIndex.value = i;
                            break;
                        }
                    }
                    scope.attributes.currentItem = scope.attributes.staticOptions.value[scope.attributes.currentIndex.value];
                });

                scope.$watch('attributes.binding.value', function(newValue){
                    if(newValue){
                        scope.attributes.isBindingPresent.value = true;
                    }else{
                        scope.attributes.isBindingPresent.value = false;
                    }
                });

                scope.$watch('attributes.options.source', function(newValue){
                    if(newValue){
                        scope.attributes.dynamicPresent.value = true;
                    }else{
                        scope.attributes.dynamicPresent.value = false;
                    }
                });

                scope.$watch('$gcscope[attributes.binding.value]', function (newVal) {
                    if (!angular.isDefined(attrs.dfxGcDesign) && !angular.isDefined(attrs.dfxGcEdit)) {
                        if(scope.attributes.isBindingPresent.value){
                            var bindingString = scope.attributes.binding.value;
                            eval("scope." + bindingString + "= newVal ;");
                        }
                    }
                });
                if (!angular.isDefined(attrs.dfxGcDesign) && !angular.isDefined(attrs.dfxGcEdit)) {
                    basectrl.bindScopeVariable( scope, component.attributes.binding.value);
                    basectrl.bindScopeVariable(scope, component.attributes.options.source);
                    for (var i = 0; i < scope.attributes.staticOptions.value.length; i++) {
                        switch ( scope.attributes.staticOptions.value[i].value ) {
                            case 'true': scope.attributes.staticOptions.value[i].value = true; break;
                            case 'false': scope.attributes.staticOptions.value[i].value = false; break;
                        }
                    }
                }

                scope.changeWidth = function(){
                    $('#' + scope.component_id).css('width', scope.attributes.flex.value + '%');
                };
                if (!angular.isDefined(attrs.dfxGcEdit)) {
                    scope.changeWidth();
                }
            });
        }
    }
}]);

dfxGControls.directive('dfxGcWebSwitch', ['$timeout', '$mdDialog', function($timeout, $mdDialog) {
    return {
        restrict: 'A',
        require: '^dfxGcWebBase',
        scope: true,
        templateUrl: function( el, attrs ) {
            if (angular.isDefined(attrs.dfxGcEdit)) {
                return '/gcontrols/web/switch_edit.html';
            } else if (angular.isDefined(attrs.dfxGcDesign)) {
                return '/gcontrols/web/switch_design.html';
            } else {
                return '/gcontrols/web/switch.html';
            }
        },
        link: function(scope, element, attrs, basectrl) {
            var component = scope.getComponent(element);
            scope.$gcscope = scope;
            basectrl.init(scope, element, component, attrs, 'switch').then(function(){
                if(!scope.attributes.hasOwnProperty('isBindingPresent')){scope.attributes.isBindingPresent = {"value": false};}
                if(!scope.attributes.hasOwnProperty('dynamicPresent')){scope.attributes.dynamicPresent = {"value": false};}
                if(!scope.attributes.hasOwnProperty('selectedIndex')){scope.attributes.selectedIndex = {"value": ""};}
                if(!scope.attributes.hasOwnProperty('counterSwitch')){scope.attributes.counterSwitch = { "value": 1 };}

                scope.attributes.buttonClass.value = scope.attributes.buttonClass.value.replace("md-primary", "");
                scope.attributes.switchValue.status = "overridden" ;
                scope.attributes.binding.status = "overridden" ;
                scope.attributes.source.status = "overridden" ;
                scope.attributes.staticArray.status = "overridden" ;
                scope.attributes.selectedIndex.status = "overridden" ;
                scope.dynamicSource = false;

                if(scope.attributes.displayValue.value === ""){
                    scope.attributes.displayValue.value = false;
                    scope.attributes.selectedIndex.value = 0;
                }

                scope.showOptionsEditor = function(ev) {
                    $mdDialog.show({
                        scope: scope.$new(),
                        parent: angular.element(document.body),
                        targetEvent: ev,
                        clickOutsideToClose:true,
                        ariaLabel: 'options-editor',
                        templateUrl: '/gcontrols/web/switch_options_editor.html',
                        onComplete: function() {
                            $('.menu-structure li').eq(scope.attributes.selectedIndex.value).addClass('active');
                        },
                        controller: function() {
                            scope.attributes.currentItem = scope.attributes.staticArray.value[scope.attributes.selectedIndex.value];
                            scope.closeDialog = function() {
                                $mdDialog.hide();
                            }
                        }
                    });
                }

                scope.activeOption = function() {
                    $('.menu-structure li').removeClass('active');
                    $('.menu-structure li').eq( scope.attributes.selectedIndex.value ).addClass('active');
                }

                scope.selectOptionItem = function( index ) {
                    scope.attributes.staticArray.status = "overridden";
                    scope.attributes.selectedIndex.value = index;
                    scope.attributes.currentItem = scope.attributes.staticArray.value[scope.attributes.selectedIndex.value];
                    scope.activeOption();
                }

                scope.addSwitchItem = function(){
                    scope.attributes.staticArray.status = "overridden" ;
                    scope.attributes.counterSwitch.value++;
                    var opt = "'option" + scope.attributes.counterSwitch.value +": '" ;
                    scope.attributes.selectedIndex.value++;
                    scope.attributes.staticArray.value.splice(scope.attributes.selectedIndex.value, 0, {"label": opt, "checked":"", "unchecked":"", "isChecked": false});
                    scope.attributes.currentItem = scope.attributes.staticArray.value[scope.attributes.selectedIndex.value];
                    $timeout(function() { scope.activeOption(); }, 0);
                };

                scope.moveOptionUp = function() {
                    if ( scope.attributes.selectedIndex.value > 0 ) {
                        var movedOption = scope.attributes.currentItem,
                            fromIndex = scope.attributes.selectedIndex.value,
                            toIndex = scope.attributes.selectedIndex.value - 1;
                        scope.attributes.staticArray.value.splice(fromIndex, 1);
                        scope.attributes.staticArray.value.splice(toIndex, 0, movedOption);
                        --scope.attributes.selectedIndex.value;
                        scope.attributes.currentItem = scope.attributes.staticArray.value[scope.attributes.selectedIndex.value];
                        scope.activeOption();
                    }
                }

                scope.moveOptionDown = function() {
                    if ( scope.attributes.selectedIndex.value < ( scope.attributes.staticArray.value.length - 1 )) {
                        var movedOption = scope.attributes.currentItem,
                            fromIndex = scope.attributes.selectedIndex.value,
                            toIndex = scope.attributes.selectedIndex.value + 1;
                        scope.attributes.staticArray.value.splice(fromIndex, 1);
                        scope.attributes.staticArray.value.splice(toIndex, 0, movedOption);
                        ++scope.attributes.selectedIndex.value;
                        scope.attributes.currentItem = scope.attributes.staticArray.value[scope.attributes.selectedIndex.value];
                        scope.activeOption();
                    }
                }

                scope.removeSwitchItem = function(){
                    scope.attributes.staticArray.status = "overridden";
                    if(scope.attributes.staticArray.value.length === 1){
                        scope.attributes.selectedIndex.value = 0;
                        scope.attributes.currentItem = scope.attributes.staticArray.value[0];
                    }else{
                        var temp = scope.attributes.selectedIndex.value;
                        scope.attributes.staticArray.value.splice(temp, 1);
                        if(temp === 0){
                            scope.attributes.selectedIndex.value = 0;
                            scope.attributes.currentItem = scope.attributes.staticArray.value[0];
                        }else{
                            scope.attributes.selectedIndex.value = temp - 1;
                            scope.attributes.currentItem = scope.attributes.staticArray.value[scope.attributes.selectedIndex.value];
                        }
                    }
                    scope.activeOption();
                };

                scope.ngClickFunc = function(){
                    if(scope.attributes.onclick.value){
                        $timeout(function(){
                            eval('scope.' + scope.attributes.onclick.value) ;
                        }, 0);
                    }
                };

                scope.$watch('attributes.selectedIndex.value', function(newValue){
                    scope.attributes.selectedIndex.value = parseInt(newValue);
                });

                 scope.$watch('attributes.binding.value', function(newValue){
                     var bindingExp = /^[-a-z0-9_]+$/gi,
                         bindingRes = bindingExp.test( newValue),
                         startString = isNaN( newValue.charAt(0) );
                     if( newValue && bindingRes && startString ) {
                         scope.attributes.isBindingPresent.value = true;
                     }else{
                         scope.attributes.isBindingPresent.value = false;
                    }
                 });


                scope.$watch('attributes.source.value', function(newValue){
                    var sourceExp = /^[-a-z0-9_]+$/gi,
                        sourceRes = sourceExp.test( newValue),
                        startString = isNaN( newValue.charAt(0) );
                    if( newValue && sourceRes && startString ){
                        scope.attributes.dynamicPresent.value = true;
                    }else{
                        scope.attributes.dynamicPresent.value = false;
                    }

                    if(scope.attributes.dynamicPresent.value && scope.attributes.isBindingPresent.value){
                        scope.attributes.bindingBoolean.value = [];
                        if ( scope.$gcscope[scope.attributes.source.value] && scope.$gcscope[scope.attributes.binding.value]) {
                            for(var i = 0; i < scope.$gcscope[scope.attributes.source.value].length; i++){
                                if(scope.$gcscope[scope.attributes.binding.value][i]=== scope.$gcscope[scope.attributes.source.value][i][scope.attributes.switchValue.trueSwitchValue]){
                                    scope.attributes.bindingBoolean.value.push(true);
                                }else{
                                    scope.attributes.bindingBoolean.value.push(false);
                                }
                            }
                        }
                    }else if(scope.attributes.dynamicPresent.value === false){
                        scope.attributes.bindingBoolean.value = [];
                        if(!angular.isDefined(attrs.dfxGcDesign) && !angular.isDefined(attrs.dfxGcEdit)){
                            for(var i = 0; i < scope.attributes.staticArray.value.length; i++){
                                if(scope.$gcscope[scope.attributes.binding.value]){
                                    var checked = '';
                                    var temp = scope.attributes.staticArray.value[i].checked ;
                                    if(angular.isString(temp) && (temp.charAt(0) === '\'' && temp.charAt(temp.length-1)==='\'')||(temp.charAt(0) === '\"' && temp.charAt(temp.length-1)==='\"')){
                                        checked = temp.substring(1, temp.length-1);
                                    }else if(temp === 'true'){
                                        checked = 'true';
                                    }else {
                                        try{
                                            var eval_checked = eval('scope.' + scope.attributes.staticArray.value[i].checked) ;
                                            checked = "" + eval_checked ;
                                            scope.attributes.staticArray.value[i].checked = eval_checked;
                                        }catch(e){}
                                    }
                                    var checked_binding = '';
                                    var binding_val = eval('scope.' + scope.attributes.binding.value)[i] ;
                                    var temp_binding ="" + binding_val ;

                                    if((temp_binding.charAt(0) === '\'' && temp_binding.charAt(temp_binding.length-1)==='\'')||(temp_binding.charAt(0) === '\"' && temp_binding.charAt(temp_binding.length-1)==='\"')){ // in case when js wraps in quoites
                                        checked_binding = temp_binding.substring(1, temp_binding.length-1);
                                        if(checked_binding === checked){
                                            scope.attributes.bindingBoolean.value.push(true);
                                        }else{
                                            scope.attributes.bindingBoolean.value.push(false);
                                        }
                                    }else{
                                        if(temp_binding === checked){
                                            scope.attributes.bindingBoolean.value.push(true);
                                        }else{
                                            scope.attributes.bindingBoolean.value.push(false);
                                        }
                                    }

                                }
                                if(scope.attributes.staticArray.value[i].checked==='true'){scope.attributes.staticArray.value[i].checked=true;}
                                if(scope.attributes.staticArray.value[i].unchecked==='false'){scope.attributes.staticArray.value[i].unchecked=false;}
                            }
                        }
                    }

                });

                scope.$watchCollection('attributes.bindingBoolean.value', function (newVal, oldVal) {
                    if(!angular.isDefined(attrs.dfxGcDesign) && !angular.isDefined(attrs.dfxGcEdit)){
                        if(scope.attributes.isBindingPresent.value && scope.attributes.dynamicPresent.value && !scope.dynamicSource){
                            var bindingString = scope.attributes.binding.value;
                            if ( scope.$gcscope[scope.attributes.source.value] && scope.$gcscope[scope.attributes.binding.value] ) {
                                for(var i = 0; i < scope.$gcscope[scope.attributes.source.value].length; i++){
                                    if(scope.attributes.bindingBoolean.value[i]){
                                        scope.$gcscope[scope.attributes.binding.value][i] = scope.$gcscope[scope.attributes.source.value][i][scope.attributes.switchValue.trueSwitchValue] ;
                                    }else{
                                        scope.$gcscope[scope.attributes.binding.value][i] = scope.$gcscope[scope.attributes.source.value][i][scope.attributes.switchValue.falseSwitchValue] ;
                                    }
                                }
                            }
                        }else if(scope.attributes.isBindingPresent.value && scope.attributes.dynamicPresent.value=== false && scope.$gcscope[scope.attributes.binding.value]){
                            for(var i = 0; i < scope.attributes.staticArray.value.length; i++){
                                if(scope.attributes.bindingBoolean.value[i]){
                                    scope.$gcscope[scope.attributes.binding.value][i] = scope.attributes.staticArray.value[i].checked ;
                                }else{
                                    scope.$gcscope[scope.attributes.binding.value][i] = scope.attributes.staticArray.value[i].unchecked ;
                                }
                            }
                        }
                    }
                });
                scope.$watchCollection('$gcscope[attributes.binding.value]', function (newVal, oldVal) {
                    if(!angular.isDefined(attrs.dfxGcDesign) && !angular.isDefined(attrs.dfxGcEdit)) {
                        scope.attributes.bindingBoolean.value = [];
                        if(scope.attributes.isBindingPresent.value && scope.attributes.dynamicPresent.value){
                            if ( scope.$gcscope[scope.attributes.source.value] && scope.$gcscope[scope.attributes.binding.value] ) {
                                for(var i = 0; i < scope.$gcscope[scope.attributes.source.value].length; i++){
                                    if(scope.$gcscope[scope.attributes.binding.value][i]=== scope.$gcscope[scope.attributes.source.value][i][scope.attributes.switchValue.trueSwitchValue]){
                                        scope.attributes.bindingBoolean.value.push(true);
                                    }else{
                                        scope.attributes.bindingBoolean.value.push(false);
                                    }
                                }
                            }
                        }else if(scope.attributes.isBindingPresent.value && scope.attributes.dynamicPresent.value=== false && scope.$gcscope[scope.attributes.binding.value]){
                            for(var i = 0; i < scope.attributes.staticArray.value.length; i++){
                                if(scope.$gcscope[scope.attributes.binding.value][i]=== scope.attributes.staticArray.value[i].checked){
                                    scope.attributes.bindingBoolean.value.push(true);
                                }else{
                                    scope.attributes.bindingBoolean.value.push(false);
                                }
                            }
                        }
                     }
                });
                scope.$watch('$gcscope[attributes.source.value]', function(newVal, oldVal) {
                    scope.dynamicSource = false;
                    if ( !angular.equals(newVal, oldVal) && !angular.isDefined(attrs.dfxGcDesign) && !angular.isDefined(attrs.dfxGcEdit) ) {
                        if ( scope.attributes.isBindingPresent.value && scope.$gcscope[scope.attributes.binding.value] ) {
                            for(var i = 0; i < newVal.length; i++){
                                if ( scope.$gcscope[scope.attributes.binding.value][i] === newVal[i][scope.attributes.switchValue.trueSwitchValue] ) {
                                    scope.attributes.bindingBoolean.value.push(true);
                                }else{
                                    scope.attributes.bindingBoolean.value.push(false);
                                }
                            }
                        }
                    }
                    scope.dynamicSource = true;
                }, true);
                if (!angular.isDefined(attrs.dfxGcDesign) && !angular.isDefined(attrs.dfxGcEdit)) {
                    basectrl.bindScopeVariable( scope, component.attributes.binding.value);
                    basectrl.bindScopeVariable( scope, component.attributes.source.value );
                    for(var i = 0; i < component.attributes.source.value.length; i++){
                        scope.attributes.defaultArray.value.push(false);
                    }
                }
            });

        }
    }
}]);

dfxGControls.directive('dfxGcWebCheckbox', ['$timeout', '$mdDialog', function($timeout, $mdDialog) {
    return {
        restrict: 'A',
        require: '^dfxGcWebBase',
        scope: true,
        templateUrl: function( el, attrs ) {
            if (angular.isDefined(attrs.dfxGcEdit)) {
                return '/gcontrols/web/checkbox_edit.html';
            } else if (angular.isDefined(attrs.dfxGcDesign)) {
                return '/gcontrols/web/checkbox_design.html';
            } else {
                return '/gcontrols/web/checkbox.html';
            }
        },
        link: function(scope, element, attrs, basectrl) {
            var component = scope.getComponent(element);
            scope.$gcscope = scope;
            basectrl.init(scope, element, component, attrs, 'checkbox').then(function(){
                if(!scope.attributes.hasOwnProperty('isBindingPresent')){scope.attributes.isBindingPresent = {"value": false};}
                if(!scope.attributes.hasOwnProperty('dynamicPresent')){scope.attributes.dynamicPresent = {"value": false};}
                if(!scope.attributes.hasOwnProperty('selectedIndex')){scope.attributes.selectedIndex = {"value": ""};}
                if(!scope.attributes.hasOwnProperty('counterCheck')){scope.attributes.counterCheck = { "value": 1 };}

                scope.attributes.buttonClass.value = scope.attributes.buttonClass.value.replace("md-primary", "");
                scope.attributes.checkValue.status = "overridden" ;
                scope.attributes.binding.status = "overridden" ;
                scope.attributes.source.status = "overridden" ;
                scope.attributes.staticArray.status = "overridden";
                scope.attributes.selectedIndex.status = "overridden";
                scope.dynamicSource = false;

                if(scope.attributes.displayValue.value === ""){
                    scope.attributes.displayValue.value = false;
                    scope.attributes.selectedIndex.value = 0;
                }

                scope.showOptionsEditor = function(ev) {
                    $mdDialog.show({
                        scope: scope.$new(),
                        parent: angular.element(document.body),
                        targetEvent: ev,
                        clickOutsideToClose:true,
                        ariaLabel: 'options-editor',
                        templateUrl: '/gcontrols/web/checkbox_options_editor.html',
                        onComplete: function() {
                            $('.menu-structure li').eq(scope.attributes.selectedIndex.value).addClass('active');
                        },
                        controller: function() {
                            scope.attributes.currentItem = scope.attributes.staticArray.value[scope.attributes.selectedIndex.value];
                            scope.closeDialog = function() {
                                $mdDialog.hide();
                            }
                        }
                    });
                }

                scope.activeOption = function() {
                    $('.menu-structure li').removeClass('active');
                    $('.menu-structure li').eq( scope.attributes.selectedIndex.value ).addClass('active');
                }

                scope.selectOptionItem = function( index ) {
                    scope.attributes.staticArray.status = "overridden";
                    scope.attributes.selectedIndex.value = index;
                    scope.attributes.currentItem = scope.attributes.staticArray.value[scope.attributes.selectedIndex.value];
                    scope.activeOption();
                }

                scope.addCheckItem = function(){
                    scope.attributes.staticArray.status = "overridden" ;
                    scope.attributes.counterCheck.value++;
                    var opt = "'option" + scope.attributes.counterCheck.value +": '" ;
                    scope.attributes.selectedIndex.value++;
                    scope.attributes.staticArray.value.splice(scope.attributes.selectedIndex.value, 0, {"label": opt, "checked":"", "unchecked":"", "isChecked": false});
                    scope.attributes.currentItem = scope.attributes.staticArray.value[scope.attributes.selectedIndex.value];
                    $timeout(function() { scope.activeOption(); }, 0);
                    scope.switchDirection(scope.attributes.direction.value);
                };

                scope.moveOptionUp = function() {
                    if ( scope.attributes.selectedIndex.value > 0 ) {
                        var movedOption = scope.attributes.currentItem,
                            fromIndex = scope.attributes.selectedIndex.value,
                            toIndex = scope.attributes.selectedIndex.value - 1;
                        scope.attributes.staticArray.value.splice(fromIndex, 1);
                        scope.attributes.staticArray.value.splice(toIndex, 0, movedOption);
                        --scope.attributes.selectedIndex.value;
                        scope.attributes.currentItem = scope.attributes.staticArray.value[scope.attributes.selectedIndex.value];
                        scope.activeOption();
                    }
                }

                scope.moveOptionDown = function() {
                    if ( scope.attributes.selectedIndex.value < ( scope.attributes.staticArray.value.length - 1 )) {
                        var movedOption = scope.attributes.currentItem,
                            fromIndex = scope.attributes.selectedIndex.value,
                            toIndex = scope.attributes.selectedIndex.value + 1;
                        scope.attributes.staticArray.value.splice(fromIndex, 1);
                        scope.attributes.staticArray.value.splice(toIndex, 0, movedOption);
                        ++scope.attributes.selectedIndex.value;
                        scope.attributes.currentItem = scope.attributes.staticArray.value[scope.attributes.selectedIndex.value];
                        scope.activeOption();
                    }
                }

                scope.removeCheckItem = function(){
                    scope.attributes.staticArray.status = "overridden";
                    if(scope.attributes.staticArray.value.length === 1){
                        scope.attributes.selectedIndex.value = 0;
                        scope.attributes.currentItem = scope.attributes.staticArray.value[0];
                    }else{
                        var temp = scope.attributes.selectedIndex.value;
                        scope.attributes.staticArray.value.splice(temp, 1);
                        if(temp === 0){
                            scope.attributes.selectedIndex.value = 0;
                            scope.attributes.currentItem = scope.attributes.staticArray.value[0];
                        }else{
                            scope.attributes.selectedIndex.value = temp - 1;
                            scope.attributes.currentItem = scope.attributes.staticArray.value[scope.attributes.selectedIndex.value];
                        }
                    }
                    scope.activeOption();
                };

                scope.switchDirection = function(direction){
                    $timeout(function () {
                        try{
                            scope.checkboxes = '#' + scope.component_id + '> div.gc-checkbox';
                            scope.checkboxes_arr = $(scope.checkboxes).children() ;
                            if(direction === 'row'){
                                for(var i = 1; i < scope.checkboxes_arr.length; i++){
                                    $(scope.checkboxes_arr[i]).css("display", "inline-block");
                                }
                                scope.$apply(function(){});
                            }else{
                                for(var i = 1; i < scope.checkboxes_arr.length; i++){
                                    $(scope.checkboxes_arr[i]).css("display", "block");
                                }
                            }
                        }catch(e){
                            /*console.log(e.message);*/
                        }
                    },0);
                };

                scope.ngClickFunc = function(){
                    if(scope.attributes.onclick.value){
                        $timeout(function(){
                            eval('scope.' + scope.attributes.onclick.value) ;
                        }, 0);
                    }
                };

                scope.$watch('attributes.direction.value', function(newValue){
                    scope.switchDirection(newValue);
                });

                scope.$watch('attributes.selectedIndex.value', function(newValue){
                    scope.attributes.selectedIndex.value = parseInt(newValue);
                });

                scope.$watch('attributes.binding.value', function(newValue){
                    var bindingExp = /^[-a-z0-9_]+$/gi,
                        bindingRes = bindingExp.test( newValue),
                        startString = isNaN( newValue.charAt(0) );
                    if( newValue && bindingRes && startString ) {
                        scope.attributes.isBindingPresent.value = true;
                    }else{
                        scope.attributes.isBindingPresent.value = false;
                    }
                });

                scope.$watch('attributes.source.value', function(newValue){
                    var sourceExp = /^[-a-z0-9_]+$/gi,
                        sourceRes = sourceExp.test( newValue),
                        startString = isNaN( newValue.charAt(0) );
                    if( newValue && sourceRes && startString ){
                        scope.attributes.dynamicPresent.value = true;
                    }else{
                        scope.attributes.dynamicPresent.value = false;
                    }

                    if(scope.attributes.dynamicPresent.value && scope.attributes.isBindingPresent.value){
                        if(!angular.isDefined(attrs.dfxGcDesign) && !angular.isDefined(attrs.dfxGcEdit)){
                            scope.attributes.bindingBoolean.value = [];
                            if ( scope.$gcscope[scope.attributes.source.value] ) {
                                for (var i = 0; i < scope.$gcscope[scope.attributes.source.value].length; i++) {
                                    if (scope.$gcscope[scope.attributes.binding.value]) {
                                        if (scope.$gcscope[scope.attributes.binding.value][i] === scope.$gcscope[scope.attributes.source.value][i][scope.attributes.checkValue.trueCheckValue]) {
                                            scope.attributes.bindingBoolean.value.push(true);
                                        } else {
                                            scope.attributes.bindingBoolean.value.push(false);
                                        }
                                    }
                                }
                            }
                        }
                    }else if(scope.attributes.dynamicPresent.value===false && scope.attributes.isBindingPresent.value){
                        if(!angular.isDefined(attrs.dfxGcDesign) && !angular.isDefined(attrs.dfxGcEdit)){
                            scope.attributes.bindingBoolean.value = [];
                            for(var i = 0; i < scope.attributes.staticArray.value.length; i++){
                                if(scope.$gcscope[scope.attributes.binding.value]){
                                    var checked = '';
                                    var temp = scope.attributes.staticArray.value[i].checked ;
                                    if(angular.isString(temp) && (temp.charAt(0) === '\'' && temp.charAt(temp.length-1)==='\'')||(temp.charAt(0) === '\"' && temp.charAt(temp.length-1)==='\"')){
                                        checked = temp.substring(1, temp.length-1);
                                    }else if(temp === 'true'){
                                        checked = 'true';
                                    }else {
                                        try{
                                            var eval_checked = eval('scope.' + scope.attributes.staticArray.value[i].checked) ;
                                            checked = "" + eval_checked ;
                                            scope.attributes.staticArray.value[i].checked = eval_checked;
                                        }catch(e){}
                                    }
                                    var checked_binding = '';
                                    var binding_val = eval('scope.' + scope.attributes.binding.value)[i] ;
                                    var temp_binding ="" + binding_val ;

                                    if((temp_binding.charAt(0) === '\'' && temp_binding.charAt(temp_binding.length-1)==='\'')||(temp_binding.charAt(0) === '\"' && temp_binding.charAt(temp_binding.length-1)==='\"')){ // in case when js wraps in quoites
                                        checked_binding = temp_binding.substring(1, temp_binding.length-1);
                                        if(checked_binding === checked){
                                            scope.attributes.bindingBoolean.value.push(true);
                                        }else{
                                            scope.attributes.bindingBoolean.value.push(false);
                                        }
                                    }else{
                                        if(temp_binding === checked){
                                            scope.attributes.bindingBoolean.value.push(true);
                                        }else{
                                            scope.attributes.bindingBoolean.value.push(false);
                                        }
                                    }
                                }
                                if(scope.attributes.staticArray.value[i].checked==='true'){scope.attributes.staticArray.value[i].checked=true;}
                                if(scope.attributes.staticArray.value[i].unchecked==='false'){scope.attributes.staticArray.value[i].unchecked=false;}
                            }
                        }

                    }else if(scope.attributes.dynamicPresent.value===false && scope.attributes.isBindingPresent.value===false){
                        if(!angular.isDefined(attrs.dfxGcDesign) && !angular.isDefined(attrs.dfxGcEdit)){
                            scope.attributes.bindingBoolean.value = [];
                            for(var i = 0; i < scope.attributes.staticArray.value.length; i++){
                                    scope.attributes.bindingBoolean.value.push(false);
                            }
                        }
                    }
                }, true);

                scope.$watchCollection('attributes.bindingBoolean.value', function (newVal, oldVal) {
                    if(!angular.isDefined(attrs.dfxGcDesign) && !angular.isDefined(attrs.dfxGcEdit) && !scope.dynamicSource ){
                        if(scope.attributes.isBindingPresent.value && scope.attributes.dynamicPresent.value ){
                            if ( scope.$gcscope[scope.attributes.source.value] && scope.$gcscope[scope.attributes.binding.value] ) {
                                for(var i = 0; i < scope.$gcscope[scope.attributes.source.value].length; i++){
                                    if(scope.attributes.bindingBoolean.value[i]){
                                        scope.$gcscope[scope.attributes.binding.value][i] = scope.$gcscope[scope.attributes.source.value][i][scope.attributes.checkValue.trueCheckValue] ;
                                    }else{
                                        scope.$gcscope[scope.attributes.binding.value][i] = scope.$gcscope[scope.attributes.source.value][i][scope.attributes.checkValue.falseCheckValue] ;
                                    }
                                }
                            }
                        }else if(scope.attributes.isBindingPresent.value && scope.attributes.dynamicPresent.value=== false && scope.$gcscope[scope.attributes.binding.value]){
                            for(var i = 0; i < scope.attributes.staticArray.value.length; i++){
                                if(scope.attributes.bindingBoolean.value[i]){
                                    scope.$gcscope[scope.attributes.binding.value][i] = scope.attributes.staticArray.value[i].checked ;
                                }else{
                                    scope.$gcscope[scope.attributes.binding.value][i] = scope.attributes.staticArray.value[i].unchecked ;
                                }
                            }
                        }
                    }
                });

                scope.$watchCollection('$gcscope[attributes.binding.value]', function (newVal, oldVal) {
                    if(!angular.isDefined(attrs.dfxGcDesign) && !angular.isDefined(attrs.dfxGcEdit)) {
                        scope.attributes.bindingBoolean.value = [];
                        if(scope.attributes.isBindingPresent.value && scope.attributes.dynamicPresent.value ){
                            if ( scope.$gcscope[scope.attributes.source.value] && scope.$gcscope[scope.attributes.binding.value] ) {
                                for(var i = 0; i < scope.$gcscope[scope.attributes.source.value].length; i++){
                                    if(scope.$gcscope[scope.attributes.binding.value][i]=== scope.$gcscope[scope.attributes.source.value][i][scope.attributes.checkValue.trueCheckValue]){
                                        scope.attributes.bindingBoolean.value.push(true);
                                    }else{
                                        scope.attributes.bindingBoolean.value.push(false);
                                    }
                                }
                            }
                        }else if(scope.attributes.isBindingPresent.value && scope.attributes.dynamicPresent.value=== false && scope.$gcscope[scope.attributes.binding.value]){
                            for(var i = 0; i < scope.attributes.staticArray.value.length; i++){
                                if(scope.$gcscope[scope.attributes.binding.value][i]=== scope.attributes.staticArray.value[i].checked){
                                    scope.attributes.bindingBoolean.value.push(true);
                                }else{
                                    scope.attributes.bindingBoolean.value.push(false);
                                }
                            }
                        }
                    }
                });

                scope.$watch('$gcscope[attributes.source.value]', function(newVal, oldVal) {
                    scope.dynamicSource = false;
                    if ( !angular.equals(newVal, oldVal) && !angular.isDefined(attrs.dfxGcDesign) && !angular.isDefined(attrs.dfxGcEdit) ) {
                        if ( scope.attributes.isBindingPresent.value && scope.$gcscope[scope.attributes.binding.value] ) {
                            for(var i = 0; i < newVal.length; i++){
                                if ( scope.$gcscope[scope.attributes.binding.value][i] === newVal[i][scope.attributes.checkValue.trueCheckValue] ) {
                                    scope.attributes.bindingBoolean.value.push(true);
                                }else{
                                    scope.attributes.bindingBoolean.value.push(false);
                                }
                            }
                        }
                    }
                    if(scope.attributes.source.value && scope.attributes.source.value!==''){scope.dynamicSource = true;}
                }, true);

                if (!angular.isDefined(attrs.dfxGcDesign) && !angular.isDefined(attrs.dfxGcEdit)) {
                    basectrl.bindScopeVariable(scope, component.attributes.binding.value);
                    basectrl.bindScopeVariable(scope, component.attributes.source.value);
                    for(var i = 0; i < component.attributes.source.value.length; i++){
                        scope.attributes.defaultArray.value.push(false);
                    }
                }
            });
        }
    }
}]);

dfxGControls.directive('dfxGcWebTabs', ['$timeout', '$compile', function($timeout, $compile) {
    return {
        restrict: 'A',
        require: '^dfxGcWebBase',
        scope: true,
        templateUrl: function( el, attrs ) {
            if (angular.isDefined(attrs.dfxGcEdit)) {
                return '/gcontrols/web/tabs_edit.html';
            } else if (angular.isDefined(attrs.dfxGcDesign)) {
                return '/gcontrols/web/tabs_design.html';
            } else {
                return '/gcontrols/web/tabs.html';
            }
        },
        link: function(scope, element, attrs, basectrl) {
            var component = scope.$parent.getComponent(element);
            basectrl.init(scope, element, component, attrs, 'tabs').then(function(){
                scope.attributes.layoutType = { "value": "tabs" };
                scope.attributes.initialized = { "value": true };
                if(!scope.attributes.hasOwnProperty('tabIndex')){scope.attributes.tabIndex = { "value": "" }}
                if(!scope.attributes.toolbar.hasOwnProperty('collapsible')){scope.attributes.toolbar.collapsible = { "value": "false" }}
                if(!scope.attributes.toolbar.hasOwnProperty('collapsed')){scope.attributes.toolbar.collapsed = { "value": "false" }}
                scope.attributes.toolbar.leftMenu.equalButtonSize = { "value": false };
                scope.attributes.toolbar.leftMenu.initialClick = { "value": false };
                scope.attributes.toolbar.leftMenu.dynamicPresent = { "value": false };
                scope.attributes.toolbar.rightMenu.equalButtonSize = { "value": false };
                scope.attributes.toolbar.rightMenu.initialClick = { "value": false };
                scope.attributes.toolbar.rightMenu.dynamicPresent = { "value": false };
                if(scope.attributes.toolbar.leftMenu.hasOwnProperty('iconBarClass')){delete scope.attributes.toolbar.leftMenu.iconBarClass;}
                if(scope.attributes.toolbar.rightMenu.hasOwnProperty('iconBarClass')){delete scope.attributes.toolbar.rightMenu.iconBarClass;}
                if(scope.attributes.toolbar.leftMenu.hasOwnProperty('buttonClass')){delete scope.attributes.toolbar.leftMenu.buttonClass;}
                if(scope.attributes.toolbar.rightMenu.hasOwnProperty('buttonClass')){delete scope.attributes.toolbar.rightMenu.buttonClass;}
                scope.attributes.flex.status = "overridden" ;
                scope.attributes.tabs.status = "overridden" ;
                scope.attributes.centerTabs.status = "overridden" ;
                if(scope.attributes.tabIndex.value === ""){
                    scope.attributes.tabIndex.value = 0;
                }

                scope.moveUpRow = function(index){
                    if(index>0){
                        var curCols = $('#' + scope.component_id + '_layout_' + scope.attributes.tabIndex.value + '_row_' + index).children() ;
                        var nextCols = $('#' + scope.component_id + '_layout_' + scope.attributes.tabIndex.value + '_row_' + (index-1)).children() ;
                        var curColsContent = [] ;
                        var nextColsContent = [] ;
                        for(var i =0; i < curCols.length; i++){
                            curColsContent.push($(curCols[i]).html()) ;
                        }
                        for(var i =0; i < nextCols.length; i++){
                            nextColsContent.push($(nextCols[i]).html()) ;
                        }

                        scope.attributes.tabs.value[scope.attributes.tabIndex.value].layout.rows.splice(index - 1, 2, scope.attributes.tabs.value[scope.attributes.tabIndex.value].layout.rows[index], scope.attributes.tabs.value[scope.attributes.tabIndex.value].layout.rows[index-1]);
                        scope.swapContainerUp(scope.component_id, index, scope.attributes.tabIndex.value);

                        $timeout(function(){
                            var movedDownCols = $('#' + scope.component_id + '_layout_' + scope.attributes.tabIndex.value + '_row_' + (index - 1)).children() ;
                            for(var j =0; j < movedDownCols.length; j++){
                                $(movedDownCols[j]).html(curColsContent[j]) ;
                                $compile($(movedDownCols[j]).contents())(scope);
                            }
                            var movedUpCols =  $('#' + scope.component_id + '_layout_' + scope.attributes.tabIndex.value + '_row_' + (index)).children() ;
                            for(var k =0; k < movedUpCols.length; k++){
                                $(movedUpCols[k]).html(nextColsContent[k]) ;
                                $compile($(movedUpCols[k]).contents())(scope);
                            }
                        },0);
                    }
                };

                scope.moveLeftCol = function(rowIndex, index){
                    if(index > 0){
                        var curCol = $('#' + scope.component_id + '_layout_' + scope.attributes.tabIndex.value + '_row_' + rowIndex + '_column_' + index) ;
                        var leftCol = $('#' + scope.component_id + '_layout_' + scope.attributes.tabIndex.value + '_row_' + rowIndex + '_column_' + (index-1)) ;
                        var curColHtml = curCol.html() ;
                        var leftColHtml = leftCol.html() ;

                        scope.attributes.tabs.value[scope.attributes.tabIndex.value].layout.rows[rowIndex].cols.splice(index-1, 2, scope.attributes.tabs.value[scope.attributes.tabIndex.value].layout.rows[rowIndex].cols[index], scope.attributes.tabs.value[scope.attributes.tabIndex.value].layout.rows[rowIndex].cols[index-1]);
                        scope.swapContainerLeft(scope.component_id, index, rowIndex, scope.attributes.tabIndex.value);

                        $timeout(function(){
                            curCol.html(leftColHtml);
                            $compile(curCol.contents())(scope);
                            leftCol.html(curColHtml);
                            $compile(leftCol.contents())(scope);
                        },0);
                    }
                };

                scope.moveDownRow = function(index){
                    if(index < scope.attributes.tabs.value[scope.attributes.tabIndex.value].layout.rows.length-1){
                        var curCols = $('#' + scope.component_id + '_layout_' + scope.attributes.tabIndex.value + '_row_' + index).children() ;
                        var nextCols = $('#' + scope.component_id + '_layout_' + scope.attributes.tabIndex.value + '_row_' + (index+1)).children() ;
                        var curColsContent = [] ;
                        var nextColsContent = [] ;
                        for(var i =0; i < curCols.length; i++){
                            curColsContent.push($(curCols[i]).html()) ;
                        }
                        for(var i =0; i < nextCols.length; i++){
                            nextColsContent.push($(nextCols[i]).html()) ;
                        }

                        scope.attributes.tabs.value[scope.attributes.tabIndex.value].layout.rows.splice(index, 2, scope.attributes.tabs.value[scope.attributes.tabIndex.value].layout.rows[index+1], scope.attributes.tabs.value[scope.attributes.tabIndex.value].layout.rows[index]);
                        scope.swapContainerDown(scope.component_id, index, scope.attributes.tabIndex.value);

                        $timeout(function(){
                            var movedDownCols = $('#' + scope.component_id + '_layout_' + scope.attributes.tabIndex.value + '_row_' + (index + 1)).children() ;
                            for(var j =0; j < movedDownCols.length; j++){
                                $(movedDownCols[j]).html(curColsContent[j]) ;
                                $compile($(movedDownCols[j]).contents())(scope);
                            }
                            var movedUpCols =  $('#' + scope.component_id + '_layout_' + scope.attributes.tabIndex.value + '_row_' + (index)).children() ;
                            for(var k =0; k < movedUpCols.length; k++){
                                $(movedUpCols[k]).html(nextColsContent[k]) ;
                                $compile($(movedUpCols[k]).contents())(scope);
                            }
                        },0);
                    }
                };

                scope.moveRightCol = function(rowIndex, index){
                    if(index < scope.attributes.tabs.value[scope.attributes.tabIndex.value].layout.rows[rowIndex].cols.length - 1){
                        var curCol = $('#' + scope.component_id + '_layout_' + scope.attributes.tabIndex.value + '_row_' + rowIndex + '_column_' + index) ;
                        var rightCol = $('#' + scope.component_id + '_layout_' + scope.attributes.tabIndex.value + '_row_' + rowIndex + '_column_' + (index+1)) ;
                        var curColHtml = curCol.html() ;
                        var rightColHtml = rightCol.html() ;

                        scope.attributes.tabs.value[scope.attributes.tabIndex.value].layout.rows[rowIndex].cols.splice(index, 2, scope.attributes.tabs.value[scope.attributes.tabIndex.value].layout.rows[rowIndex].cols[index+1], scope.attributes.tabs.value[scope.attributes.tabIndex.value].layout.rows[rowIndex].cols[index]);
                        scope.swapContainerRight(scope.component_id, index, rowIndex, scope.attributes.tabIndex.value);

                        $timeout(function(){
                            curCol.html(rightColHtml);
                            $compile(curCol.contents())(scope);
                            rightCol.html(curColHtml);
                            $compile(rightCol.contents())(scope);
                        },0);
                    }
                };

                scope.setClasses = function(){
                    $timeout(function () {
                        try{
                            for(var k = 0; k < scope.attributes.tabs.value.length; k++){
                                var tabLayoutRows = $('#' + scope.component_id + '_tab_' + k).children();
                                for(var i = 0; i < tabLayoutRows.length; i++){
                                    var tabLayoutRowsCols = $(tabLayoutRows[i]).children() ;
                                    for(var j = 0; j < tabLayoutRowsCols.length; j++){
                                        if(scope.attributes.tabs.value[k].layout.rows[i].cols[j].orientation.value === 'row'){
                                            $(tabLayoutRowsCols[j]).removeClass('layout-column');
                                            $(tabLayoutRowsCols[j]).addClass('layout-row');
                                        }else{
                                            $(tabLayoutRowsCols[j]).removeClass('layout-row');
                                            $(tabLayoutRowsCols[j]).addClass('layout-column');
                                        }
                                        $(tabLayoutRowsCols[j]).addClass('flex' + '-' + scope.attributes.tabs.value[k].layout.rows[i].cols[j].width.value);
                                    }
                                }
                            }
                        }catch(e){
                            /*console.log(e.message);*/
                        }
                    },0);
                };

                scope.setWidth = function(rowIndex, colIndex){
                    $timeout(function () {
                        var tabLayoutRows = $('#' + scope.component_id + '_tab_' + scope.attributes.tabIndex.value).children();
                        var tabLayoutRowsCols = $(tabLayoutRows[rowIndex]).children();
                        if(scope.attributes.tabs.value[scope.attributes.tabIndex.value].layout.rows[rowIndex].cols[colIndex].orientation.value === 'row'){
                            $(tabLayoutRowsCols[colIndex]).removeClass('layout-column');
                            $(tabLayoutRowsCols[colIndex]).addClass('layout-row');

                        }else{
                            $(tabLayoutRowsCols[colIndex]).removeClass('layout-row');
                            $(tabLayoutRowsCols[colIndex]).addClass('layout-column');
                        }
                    },0);
                };

                scope.addTab = function(){
                    scope.attributes.tabs.value.push(
                    {
                        "label":            "'Tab " + (scope.attributes.tabs.value.length + 1 + "'"),
                        "disabled":         { "value": "false" },
                        "classes":          { "value": "" },
                        "dynamicClasses":   { "value": "" },
                        "style":            { "value": "" },
                        "layout": {
                        "rows": [
                            {
                                "cols": [
                                    {
                                        "width":            { "value": 100},
                                        "autoWidth":        { "value": false},
                                        "display":          { "value": "true"},
                                        "classes":          { "value": "" },
                                        "dynamicClasses":   { "value": "" },
                                        "style":            { "value": "" },
                                        "orientation":      { "value": "row" },
                                        "halignment":       { "value": "start" },
                                        "valignment":       { "value": "start" }
                                    }
                                ],
                                "classes":          { "value": "" },
                                "dynamicClasses":   { "value": "" },
                                "style":            { "value": "" }
                            }
                        ],
                        "classes":          { "value": "" },
                        "dynamicClasses":   { "value": "" },
                        "style":            { "value": ""}
                    }
                    });
                    scope.attributes.tabIndex.value = scope.attributes.tabs.value.length - 1;
                    scope.setClasses();
                };

                scope.removeTab = function(){
                    if(scope.attributes.tabs.value.length>2){
                        scope.attributes.tabs.value.splice(scope.attributes.tabIndex.value, 1);
                        scope.attributes.tabIndex.value--;
                    }
                };

                scope.addLayoutRow = function(tabIndex) {
                    scope.attributes.tabs.value[tabIndex].layout.rows.push({
                        "cols": [
                            {
                                "width":            { "value": 100 },
                                "autoWidth":        { "value": false },
                                "display":          { "value": "true" },
                                "classes":          { "value": "" },
                                "dynamicClasses":   { "value": "" },
                                "style":            { "value": "" },
                                "orientation":      { "value": "row" },
                                "halignment":       { "value": "start" },
                                "valignment":       { "value": "start" },
                                "css": {
                                    "color": "",
                                    "background": "",
                                    "padding": "",
                                    "text-align": ""
                                }
                            }
                        ],
                        "classes":          { "value": "" },
                        "dynamicClasses":   { "value": "" },
                        "style":            { "value": "" }
                    });
                    scope.setClasses();
                };

                scope.deleteLayoutRow = function(rowIndex){
                    if(scope.attributes.tabs.value[scope.attributes.tabIndex.value].layout.rows.length > 1){
                        scope.attributes.tabs.value[scope.attributes.tabIndex.value].layout.rows.splice(rowIndex, 1);
                    }
                }

                scope.addLayoutColumn = function(rowIndex){
                    scope.attributes.tabs.value[scope.attributes.tabIndex.value].layout.rows[rowIndex].cols.push({
                        "width":            { "value": 25 },
                        "autoWidth":        { "value": false },
                        "display":          { "value": 'true' },
                        "classes":          { "value": "" },
                        "dynamicClasses":   { "value": "" },
                        "style":            { "value": "" },
                        "orientation":      { "value": "row" },
                        "halignment":       { "value": "start" },
                        "valignment":       { "value": "start" },
                        "css": {
                            "color": "",
                            "background": "",
                            "padding": "",
                            "text-align": ""
                        }
                    });
                    scope.setClasses();
                };

                scope.deleteLayoutColumn = function(rowIndex, colIndex) {
                    if(scope.attributes.tabs.value[scope.attributes.tabIndex.value].layout.rows[rowIndex].cols.length > 1){
                        scope.attributes.tabs.value[scope.attributes.tabIndex.value].layout.rows[rowIndex].cols.splice(colIndex, 1);
                    }
                };

                scope.setTabWidth = function() {
                    $timeout(function () {
                        try{
                            var paginationWrapper = '#' + scope.component_id + '> div.flex > md-content > md-tabs > md-tabs-wrapper > md-tabs-canvas > md-pagination-wrapper';
                            var inkBar = '#' + scope.component_id + '> div.flex > md-content > md-tabs > md-tabs-wrapper > md-tabs-canvas > md-pagination-wrapper > md-ink-bar';
                            $(paginationWrapper).css('width', '100%');
                            var temp = $($(paginationWrapper).children()[0]).css('width');
                            var stepWidth = parseInt(temp.substring(0, temp.length - 2));
                            var left = stepWidth * scope.attributes.tabIndex.value + 'px';
                            var right = stepWidth * (scope.attributes.tabs.value.length - 1 - scope.attributes.tabIndex.value) + 'px';
                            $(inkBar).css('left', left);
                            $(inkBar).css('right', right);
                        }catch(e){
                            /*console.log(e.message);*/
                        }
                    },0);
                };

                scope.$watchCollection('attributes.tabs.value[attributes.tabIndex.value].layout.rows', function(newValue){
                    if (!angular.isDefined(attrs.dfxGcDesign) && !angular.isDefined(attrs.dfxGcEdit)) {
                        scope.setClasses();
                    }else{
                        $timeout(function () {
                            try{
                                var tabLayoutRows = $('#' + scope.component_id + '_tab_' + scope.attributes.tabIndex.value).children();
                                for(var i = 0; i < tabLayoutRows.length; i++){
                                    var tabLayoutRowsCols = $(tabLayoutRows[i]).children() ;
                                    for(var j = 0; j < tabLayoutRowsCols.length; j++){
                                        if(newValue[i].cols[j].orientation.value === 'row'){
                                            $(tabLayoutRowsCols[j]).addClass('layout-row');
                                        }
                                    }
                                }
                            }catch(e){
                                /*console.log(e.message);*/
                            }
                        },0);
                    }
                 });

                scope.$watch('attributes.stretching.value', function(newValue){
                    if(newValue === 'always'){
                        scope.setTabWidth();
                    }
                });

                scope.changeWidth = function(){
                    $('#' + scope.component_id).css('width', scope.attributes.flex.value + '%');
                };
                if (!angular.isDefined(attrs.dfxGcEdit)) {
                    scope.changeWidth();
                }
                scope.collapsePanelBody = function(isCollapsed) {
                    if (!angular.isDefined(attrs.dfxGcDesign) && !angular.isDefined(attrs.dfxGcEdit)) {
                        basectrl.bindScopeVariable( scope, component.attributes.toolbar.collapsed.value );
                        if ( scope.attributes.toolbar.collapsed.value == 'true' || scope.attributes.toolbar.collapsed.value == 'false' ) {
                            if ( isCollapsed ) {
                                scope.attributes.toolbar.collapsed.value = 'false';
                            } else {
                                scope.attributes.toolbar.collapsed.value = 'true';
                            }
                        } else {
                            if ( isCollapsed ) {
                                scope.$parent_scope[scope.attributes.toolbar.collapsed.value] = false;
                            } else {
                                scope.$parent_scope[scope.attributes.toolbar.collapsed.value] = true;
                            }
                        }
                    } else {
                        if ( scope.attributes.toolbar.collapsed.value == 'false' ) {
                            scope.attributes.toolbar.collapsed.designValue = true;
                            scope.attributes.toolbar.collapsed.value = 'true';
                        } else if ( scope.attributes.toolbar.collapsed.value == 'true' ) {
                            scope.attributes.toolbar.collapsed.designValue = false;
                            scope.attributes.toolbar.collapsed.value = 'false';
                        } else {
                            if ( !scope.attributes.toolbar.collapsed.designValue || scope.attributes.toolbar.collapsed.designValue == false ) {
                                scope.attributes.toolbar.collapsed.designValue = true;
                            } else {
                                scope.attributes.toolbar.collapsed.designValue = false;
                            }
                        }
                    }
                }

                scope.checkPanelBody = function() {
                    if ( scope.attributes.toolbar.collapsed.value == 'true' ) {
                        scope.attributes.toolbar.collapsed.designValue = true;
                    } else {
                        scope.attributes.toolbar.collapsed.designValue = false;
                    }
                }

                scope.checkCollapses = function() {
                    if ( !scope.attributes.toolbar.hasOwnProperty('collapsed') ) {
                        var addCollapsed = { "collapsed": { "value": "false" }};
                        scope.attributes.toolbar.collapsed = addCollapsed.collapsed;
                    }
                    if ( !scope.attributes.toolbar.hasOwnProperty('collapsible') ) {
                        var addCollapsible = { "collapsible": { "value": "false" }};
                        scope.attributes.toolbar.collapsible = addCollapsible.collapsible;
                    }
                }

                scope.checkCollapses();

                if (angular.isDefined(attrs.dfxGcDesign)) {
                    $timeout(function(){
                        scope.checkPanelBody();
                    }, 0);
                }
            });
        }
    }
}]);

dfxGControls.directive('dfxGcWebWizard', ['$timeout', '$compile', function($timeout, $compile) {
    return {
        restrict: 'A',
        require: '^dfxGcWebBase',
        scope: true,
        templateUrl: function( el, attrs ) {
            if (angular.isDefined(attrs.dfxGcEdit)) {
                return '/gcontrols/web/wizard_edit.html';
            } else if (angular.isDefined(attrs.dfxGcDesign)) {
                return '/gcontrols/web/wizard_design.html';
            } else {
                return '/gcontrols/web/wizard.html';
            }
        },
        link: function(scope, element, attrs, basectrl) {
            var component = scope.$parent.getComponent(element);
            basectrl.init(scope, element, component, attrs, 'wizard').then(function(){
                scope.attributes.layoutType = {"value": "wizard"};
                scope.attributes.initialized = {"value": true};
                if(!scope.attributes.hasOwnProperty('stepIndex')){scope.attributes.stepIndex = { "value": "" }}
                if(scope.attributes.stepIndex.value === ""){scope.attributes.stepIndex.value = 0;}
                scope.attributes.steps.status = "overridden";
                scope.attributes.centerSteps.status = "overridden";
                scope.attributes.stepIndex.status = "overridden" ;
                scope.attributes.flex.status = "overridden";
                scope.attributes.toolbar.leftMenu.equalButtonSize = { "value": false };
                scope.attributes.toolbar.leftMenu.initialClick = { "value": false };
                scope.attributes.toolbar.leftMenu.dynamicPresent = { "value": false };
                scope.attributes.toolbar.rightMenu.equalButtonSize = { "value": false };
                scope.attributes.toolbar.rightMenu.initialClick = { "value": false };
                scope.attributes.toolbar.rightMenu.dynamicPresent = { "value": false };
                if(scope.attributes.toolbar.leftMenu.hasOwnProperty('iconStyle')){delete scope.attributes.toolbar.leftMenu.iconStyle;}
                if(scope.attributes.toolbar.leftMenu.hasOwnProperty('iconClass')){delete scope.attributes.toolbar.leftMenu.iconClass;}
                if(scope.attributes.toolbar.leftMenu.hasOwnProperty('iconBarClass')){delete scope.attributes.toolbar.leftMenu.iconBarClass;}
                if(scope.attributes.toolbar.leftMenu.hasOwnProperty('buttonStyle')){delete scope.attributes.toolbar.leftMenu.buttonStyle;}
                if(scope.attributes.toolbar.leftMenu.hasOwnProperty('buttonClass')){delete scope.attributes.toolbar.leftMenu.buttonClass;}
                if(scope.attributes.toolbar.rightMenu.hasOwnProperty('iconStyle')){delete scope.attributes.toolbar.rightMenu.iconStyle;}
                if(scope.attributes.toolbar.rightMenu.hasOwnProperty('iconClass')){delete scope.attributes.toolbar.rightMenu.iconClass;}
                if(scope.attributes.toolbar.rightMenu.hasOwnProperty('iconBarClass')){delete scope.attributes.toolbar.rightMenu.iconBarClass;}
                if(scope.attributes.toolbar.rightMenu.hasOwnProperty('buttonStyle')){delete scope.attributes.toolbar.rightMenu.buttonStyle;}
                if(scope.attributes.toolbar.rightMenu.hasOwnProperty('buttonClass')){delete scope.attributes.toolbar.rightMenu.buttonClass;}
                var previousButton = scope.attributes.previousButton.classes.value.replace("md-raised", "");
                    previousButton = previousButton.replace("md-primary", "");
                    scope.attributes.previousButton.classes.value = previousButton;
                var nextButton = scope.attributes.nextButton.classes.value.replace("md-raised", "");
                    nextButton = nextButton.replace("md-primary", "");
                    scope.attributes.nextButton.classes.value = nextButton;
                var submitButton = scope.attributes.submitButton.classes.value.replace("md-raised", "");
                    submitButton = submitButton.replace("md-primary", "");
                    scope.attributes.submitButton.classes.value = submitButton;

                for (var s = 0; s < scope.attributes.steps.value.length; s++) {
                    if(!scope.attributes.steps.value[s].hasOwnProperty('percent')){scope.attributes.steps.value[s].percent = { "value": 0 };}
                    if(!scope.attributes.steps.value[s].hasOwnProperty('isLast')){scope.attributes.steps.value[s].isLast = { "value": "" };}
                };

                scope.moveUpRow = function(index){
                    if(index>0){
                        var curCols = $('#' + scope.component_id + '_layout_' + scope.attributes.stepIndex.value + '_row_' + index).children() ;
                        var nextCols = $('#' + scope.component_id + '_layout_' + scope.attributes.stepIndex.value + '_row_' + (index-1)).children() ;
                        var curColsContent = [] ;
                        var nextColsContent = [] ;
                        for(var i =0; i < curCols.length; i++){
                            curColsContent.push($(curCols[i]).html()) ;
                        }
                        for(var i =0; i < nextCols.length; i++){
                            nextColsContent.push($(nextCols[i]).html()) ;
                        }

                        scope.attributes.steps.value[scope.attributes.stepIndex.value].layout.rows.splice(index - 1, 2, scope.attributes.steps.value[scope.attributes.stepIndex.value].layout.rows[index], scope.attributes.steps.value[scope.attributes.stepIndex.value].layout.rows[index-1]);
                        scope.swapContainerUp(scope.component_id, index, scope.attributes.stepIndex.value);

                        $timeout(function(){
                            var movedDownCols = $('#' + scope.component_id + '_layout_' + scope.attributes.stepIndex.value + '_row_' + (index - 1)).children() ;
                            for(var j =0; j < movedDownCols.length; j++){
                                $(movedDownCols[j]).html(curColsContent[j]) ;
                                $compile($(movedDownCols[j]).contents())(scope);
                            }
                            var movedUpCols =  $('#' + scope.component_id + '_layout_' + scope.attributes.stepIndex.value + '_row_' + (index)).children() ;
                            for(var k =0; k < movedUpCols.length; k++){
                                $(movedUpCols[k]).html(nextColsContent[k]) ;
                                $compile($(movedUpCols[k]).contents())(scope);
                            }
                        },0);
                    }
                };

                scope.moveLeftCol = function(rowIndex, index){
                    if(index > 0){
                        var curCol = $('#' + scope.component_id + '_layout_' + scope.attributes.stepIndex.value + '_row_' + rowIndex + '_column_' + index) ;
                        var leftCol = $('#' + scope.component_id + '_layout_' + scope.attributes.stepIndex.value + '_row_' + rowIndex + '_column_' + (index-1)) ;
                        var curColHtml = curCol.html() ;
                        var leftColHtml = leftCol.html() ;

                        scope.attributes.steps.value[scope.attributes.stepIndex.value].layout.rows[rowIndex].cols.splice(index-1, 2, scope.attributes.steps.value[scope.attributes.stepIndex.value].layout.rows[rowIndex].cols[index], scope.attributes.steps.value[scope.attributes.stepIndex.value].layout.rows[rowIndex].cols[index-1]) ;
                        scope.swapContainerLeft(scope.component_id, index, rowIndex, scope.attributes.stepIndex.value);

                        $timeout(function(){
                            curCol.html(leftColHtml);
                            $compile(curCol.contents())(scope);
                            leftCol.html(curColHtml);
                            $compile(leftCol.contents())(scope);
                        },0);
                    }
                };

                scope.moveDownRow = function(index){
                    if(index < scope.attributes.steps.value[scope.attributes.stepIndex.value].layout.rows.length-1){
                        var curCols = $('#' + scope.component_id + '_layout_' + scope.attributes.stepIndex.value + '_row_' + index).children() ;
                        var nextCols = $('#' + scope.component_id + '_layout_' + scope.attributes.stepIndex.value + '_row_' + (index+1)).children() ;
                        var curColsContent = [] ;
                        var nextColsContent = [] ;
                        for(var i =0; i < curCols.length; i++){
                            curColsContent.push($(curCols[i]).html()) ;
                        }
                        for(var i =0; i < nextCols.length; i++){
                            nextColsContent.push($(nextCols[i]).html()) ;
                        }

                        scope.attributes.steps.value[scope.attributes.stepIndex.value].layout.rows.splice(index, 2, scope.attributes.steps.value[scope.attributes.stepIndex.value].layout.rows[index+1], scope.attributes.steps.value[scope.attributes.stepIndex.value].layout.rows[index]);
                        scope.swapContainerDown(scope.component_id, index, scope.attributes.stepIndex.value);

                        $timeout(function(){
                            var movedDownCols = $('#' + scope.component_id + '_layout_' + scope.attributes.stepIndex.value + '_row_' + (index + 1)).children() ;
                            for(var j =0; j < movedDownCols.length; j++){
                                $(movedDownCols[j]).html(curColsContent[j]) ;
                                $compile($(movedDownCols[j]).contents())(scope);
                            }
                            var movedUpCols =  $('#' + scope.component_id + '_layout_' + scope.attributes.stepIndex.value + '_row_' + (index)).children() ;
                            for(var k =0; k < movedUpCols.length; k++){
                                $(movedUpCols[k]).html(nextColsContent[k]) ;
                                $compile($(movedUpCols[k]).contents())(scope);
                            }
                        },0);
                    }
                };

                scope.moveRightCol = function(rowIndex, index){
                    if(index < scope.attributes.steps.value[scope.attributes.stepIndex.value].layout.rows[rowIndex].cols.length - 1){
                        var curCol = $('#' + scope.component_id + '_layout_' + scope.attributes.stepIndex.value + '_row_' + rowIndex + '_column_' + index) ;
                        var rightCol = $('#' + scope.component_id + '_layout_' + scope.attributes.stepIndex.value + '_row_' + rowIndex + '_column_' + (index+1)) ;
                        var curColHtml = curCol.html() ;
                        var rightColHtml = rightCol.html() ;

                        scope.attributes.steps.value[scope.attributes.stepIndex.value].layout.rows[rowIndex].cols.splice(index, 2, scope.attributes.steps.value[scope.attributes.stepIndex.value].layout.rows[rowIndex].cols[index+1], scope.attributes.steps.value[scope.attributes.stepIndex.value].layout.rows[rowIndex].cols[index]) ;
                        scope.swapContainerRight(scope.component_id, index, rowIndex, scope.attributes.stepIndex.value);

                        $timeout(function(){
                            curCol.html(rightColHtml);
                            $compile(curCol.contents())(scope);
                            rightCol.html(curColHtml);
                            $compile(rightCol.contents())(scope);
                        },0);
                    }
                };

                scope.setClasses = function(){
                    $timeout(function () {
                        try{
                            for(var k = 0; k < scope.attributes.steps.value.length; k++){
                                var stepLayoutRows = $('#' + scope.component_id + '_step_' + k).children();
                                for(var i = 0; i < stepLayoutRows.length; i++){
                                    var stepLayoutRowsCols = $(stepLayoutRows[i]).children() ;
                                    for(var j = 0; j < stepLayoutRowsCols.length; j++){
                                        if(scope.attributes.steps.value[k].layout.rows[i].cols[j].orientation.value === 'row'){
                                            $(stepLayoutRowsCols[j]).removeClass('layout-column');
                                            $(stepLayoutRowsCols[j]).addClass('layout-row');
                                        }else{
                                            $(stepLayoutRowsCols[j]).removeClass('layout-row');
                                            $(stepLayoutRowsCols[j]).addClass('layout-column');
                                        }
                                        $(stepLayoutRowsCols[j]).addClass('flex' + '-' + scope.attributes.steps.value[k].layout.rows[i].cols[j].width.value);
                                    }
                                }
                            }
                        }catch(e){
                            /*console.log(e.message);*/
                        }
                    },0);
                };

                scope.setClasses();

                if (!angular.isDefined(attrs.dfxGcDesign) && !angular.isDefined(attrs.dfxGcEdit)) {
                    scope.attributes.stepIndex.value = 0;
                    scope.firstTransfer = true;
                    $timeout(function () {
                        try{
                            scope.wizardForm = eval('scope.form_' + scope.component_id);
                            var formName = '#form_' + scope.component_id ;
                            var inputs = $(formName).find('md-input-container');
                            scope.totalInputsNumber = inputs.length;
                            if(scope.totalInputsNumber > 0){
                                for(var i =0; i < scope.attributes.steps.value.length; i++){
                                    var stepFormName = '#form_' + scope.component_id + '_step_' + i;
                                    var stepInputs = $(stepFormName).find('md-input-container');
                                    scope.attributes.steps.value[i].percent.value =  100 * stepInputs.length/scope.totalInputsNumber;
                                }
                            }
                        }catch(e){
                            /*console.log(e.message);*/
                        }
                    },0);
                }

                scope.setWidth = function(rowIndex, colIndex){
                    $timeout(function () {
                        var stepLayoutRows = $('#' + scope.component_id + '_step_' + scope.attributes.stepIndex.value).children();
                        var stepLayoutRowsCols = $(stepLayoutRows[rowIndex]).children();
                        if(scope.attributes.steps.value[scope.attributes.stepIndex.value].layout.rows[rowIndex].cols[colIndex].orientation.value === 'row'){
                            $(stepLayoutRowsCols[colIndex]).removeClass('layout-column');
                            $(stepLayoutRowsCols[colIndex]).addClass('layout-row');

                        }else{
                            $(stepLayoutRowsCols[colIndex]).removeClass('layout-row');
                            $(stepLayoutRowsCols[colIndex]).addClass('layout-column');
                        }
                    },0);
                };

                scope.setStepWidth = function() {
                    $timeout(function () {
                        try{
                            var paginationWrapper = '#' + scope.component_id + '> div.layout-align-center-center.layout-row.flex > div > md-content > md-tabs > md-tabs-wrapper > md-tabs-canvas > md-pagination-wrapper';
                            var inkBar = '#' + scope.component_id + '> div.layout-align-center-center.layout-row.flex > div > md-content > md-tabs > md-tabs-wrapper > md-tabs-canvas > md-pagination-wrapper > md-ink-bar';
                            $(paginationWrapper).css('width', '100%');
                            var temp = $($(paginationWrapper).children()[0]).css('width');
                            var stepWidth = parseInt(temp.substring(0, temp.length - 2));
                            var left = stepWidth * scope.attributes.tabIndex.value + 'px';
                            var right = stepWidth * (scope.attributes.tabs.value.length - 1 - scope.attributes.tabIndex.value) + 'px';
                            $(inkBar).css('left', left);
                            $(inkBar).css('right', right);
                        }catch(e){
                            /*console.log(e.message);*/
                        }
                    },0);
                };

                scope.$watch('attributes.stretching.value', function(newValue){
                    if(newValue === 'always'){
                        scope.setStepWidth();
                    }
                });

                scope.addStep = function(){
                    scope.attributes.steps.value.push(
                        {
                            "label":            "'Step " + (scope.attributes.steps.value.length+1) + "'",
                            "validDisabled":    { "value": false },
                            "disabled":         { "value": "false" },
                            "percent":          { "value": 0 },
                            "classes":          { "value": "" },
                            "dynamicClasses":   { "value": "" },
                            "isLast":           { "value": false },
                            "style":            { "value": "" },
                            "layout": {
                                "rows": [
                                    {
                                        "cols": [
                                            {
                                                "width":            { "value": 100 },
                                                "autoWidth":        { "value": false },
                                                "display":          { "value": "true" },
                                                "classes":          { "value": "" },
                                                "dynamicClasses":   { "value": "" },
                                                "style":            { "value": "" },
                                                "orientation":      { "value": "row" },
                                                "halignment":       { "value": "start" },
                                                "valignment":       { "value": "start" }
                                            }
                                        ],
                                        "classes":          { "value": "" },
                                        "dynamicClasses":   { "value": "" },
                                        "style":            { "value": "" }
                                    }
                                ],
                                "classes":          { "value": "" },
                                "dynamicClasses":   { "value": "" },
                                "style":            { "value": "" }
                            }
                        });
                    scope.attributes.stepIndex.value = scope.attributes.steps.value.length - 1;
                    scope.setClasses();
                };

                scope.removeStep = function(){
                    scope.attributes.steps.status = "overridden" ;
                    if(scope.attributes.steps.value.length > 1){
                        scope.attributes.steps.value.splice(scope.attributes.stepIndex.value, 1);
                        if(scope.attributes.stepIndex.value !==0){
                            scope.attributes.stepIndex.value--;
                        }
                    }else{
                        /*console.log('This step can not be deleted.');*/
                    }
                };

                scope.addLayoutRow = function(stepIndex) {
                    scope.attributes.steps.value[stepIndex].layout.rows.push({
                        "cols": [
                            {
                                "width":            { "value": 100 },
                                "autoWidth":        { "value": false },
                                "display":          { "value": "true" },
                                "classes":          { "value": "" },
                                "dynamicClasses":   { "value": "" },
                                "style":            { "value": "" },
                                "orientation":      { "value": "row" },
                                "halignment":       { "value": "start" },
                                "valignment":       { "value": "start" },
                                "css": {
                                    "color": "",
                                    "background": "",
                                    "padding": "",
                                    "text-align": ""
                                }
                            }
                        ],
                        "classes":          { "value": "" },
                        "dynamicClasses":   { "value": "" },
                        "style":            { "value": "" }
                    });
                    scope.setClasses();
                };

                scope.deleteLayoutRow = function(rowIndex){
                    if(scope.attributes.steps.value[scope.attributes.stepIndex.value].layout.rows.length > 1){
                        scope.attributes.steps.value[scope.attributes.stepIndex.value].layout.rows.splice(rowIndex, 1);
                    }
                }

                scope.addLayoutColumn = function(rowIndex){
                    scope.attributes.steps.value[scope.attributes.stepIndex.value].layout.rows[rowIndex].cols.push({
                        "width":            { "value": 25 },
                        "autoWidth":        { "value": false },
                        "display":          { "value": "true" },
                        "classes":          { "value": "" },
                        "dynamicClasses":   { "value": "" },
                        "style":            { "value": "" },
                        "orientation":      { "value": "row" },
                        "halignment":       { "value": "start" },
                        "valignment":       { "value": "start" },
                        "css": {
                            "color": "",
                            "background": "",
                            "padding": "",
                            "text-align": ""
                        }
                    });
                    scope.setClasses();
                };

                scope.deleteLayoutColumn = function(rowIndex, colIndex) {
                    if(scope.attributes.steps.value[scope.attributes.stepIndex.value].layout.rows[rowIndex].cols.length > 1){
                        scope.attributes.steps.value[scope.attributes.stepIndex.value].layout.rows[rowIndex].cols.splice(colIndex, 1);
                    }
                };

                scope.incrIndex = function(){
                    scope.attributes.stepIndex.value++;
                };

                scope.decrIndex = function(){
                    scope.attributes.stepIndex.value--;
                };

                scope.prevent = function(event){
                    event.preventDefault();
                    event.stopPropagation();
                };

                scope.$watchCollection('attributes.steps[attributes.stepIndex.value].layout.rows', function(newValue){
                    if (!angular.isDefined(attrs.dfxGcDesign) && !angular.isDefined(attrs.dfxGcEdit)) {
                        scope.setClasses();
                    }else{
                        $timeout(function () {
                            try{
                                var stepLayoutRows = $('#' + scope.component_id + '_step_' + scope.attributes.stepIndex.value).children();
                                for(var i = 0; i < stepLayoutRows.length; i++){
                                    var stepLayoutRowsCols = $(stepLayoutRows[i]).children() ;
                                    for(var j = 0; j < stepLayoutRowsCols.length; j++){
                                        if(newValue[i].cols[j].orientation.value === 'row'){
                                            $(stepLayoutRowsCols[j]).addClass('layout-row');
                                        }
                                    }
                                }
                            }catch(e){
                                /*console.log(e.message);*/
                            }
                        },0);
                    }
                });

                scope.$watch('attributes.stepIndex.value', function(newValue, oldValue){
                    for(var i =0; i < scope.attributes.steps.value.length; i++){
                        if(i < scope.attributes.steps.value.length-1){
                            scope.attributes.steps.value[i].isLast.value = false;
                        }else{
                            scope.attributes.steps.value[scope.attributes.steps.value.length - 1].isLast.value = true;
                        }
                        if (!angular.isDefined(attrs.dfxGcEdit) && !angular.isDefined(attrs.dfxGcDesign)){
                            var stepFormName = 'stepForm' + scope.attributes.stepIndex.value;
                            $timeout(function () {
                                scope.stepForm = (scope.wizardForm[stepFormName]);
                            },0);
                        }
                    }
                });

                scope.$watch('stepForm.$valid', function(newValue){
                    if (!angular.isDefined(attrs.dfxGcDesign) && !angular.isDefined(attrs.dfxGcEdit)) {
                       if(typeof newValue !== "undefined"){
                           if(!newValue){
                               if(scope.attributes.stepIndex.value+1 <= scope.attributes.steps.value.length - 1){
                                   for(var i= scope.attributes.stepIndex.value+1; i < scope.attributes.steps.value.length; i++){
                                       scope.attributes.steps.value[i].validDisabled.value = true;
                                   }
                               }

                           }else{
                               if(scope.attributes.stepIndex.value+1 <= scope.attributes.steps.value.length - 1){
                                   scope.attributes.steps.value[scope.attributes.stepIndex.value+1].validDisabled.value = false;
                               }
                           }
                           scope.calcPercent();
                       }
                    }
                });
                scope.calcPercent = function(){
                    scope.attributes.percentage.value = 0;
                    $timeout(function () {
                        for(var i =0; i < scope.attributes.steps.value.length; i++){
                             if(scope.wizardForm['stepForm'+i].$valid){
                                 scope.attributes.percentage.value = scope.attributes.percentage.value + scope.attributes.steps.value[i].percent.value ;
                             }
                        }
                        scope.attributes.percentage.value = Math.round(scope.attributes.percentage.value);
                    },0);
                };

                scope.changeWidth = function(){
                    $('#' + scope.component_id).css('width', scope.attributes.flex.value + '%');
                };
                if (!angular.isDefined(attrs.dfxGcEdit)) {
                    scope.changeWidth();
                }

                scope.collapsePanelBody = function(isCollapsed) {
                    if (!angular.isDefined(attrs.dfxGcDesign) && !angular.isDefined(attrs.dfxGcEdit)) {
                        basectrl.bindScopeVariable( scope, component.attributes.toolbar.collapsed.value );
                        if ( scope.attributes.toolbar.collapsed.value == 'true' || scope.attributes.toolbar.collapsed.value == 'false' ) {
                            if ( isCollapsed ) {
                                scope.attributes.toolbar.collapsed.value = 'false';
                            } else {
                                scope.attributes.toolbar.collapsed.value = 'true';
                            }
                        } else {
                            if ( isCollapsed ) {
                                scope.$parent_scope[scope.attributes.toolbar.collapsed.value] = false;
                            } else {
                                scope.$parent_scope[scope.attributes.toolbar.collapsed.value] = true;
                            }
                        }
                    } else {
                        if ( scope.attributes.toolbar.collapsed.value == 'false' ) {
                            scope.attributes.toolbar.collapsed.designValue = true;
                            scope.attributes.toolbar.collapsed.value = 'true';
                        } else if ( scope.attributes.toolbar.collapsed.value == 'true' ) {
                            scope.attributes.toolbar.collapsed.designValue = false;
                            scope.attributes.toolbar.collapsed.value = 'false';
                        } else {
                            if ( !scope.attributes.toolbar.collapsed.designValue || scope.attributes.toolbar.collapsed.designValue == false ) {
                                scope.attributes.toolbar.collapsed.designValue = true;
                            } else {
                                scope.attributes.toolbar.collapsed.designValue = false;
                            }
                        }
                    }
                }

                scope.checkPanelBody = function() {
                    if ( scope.attributes.toolbar.collapsed.value == 'true' ) {
                        scope.attributes.toolbar.collapsed.designValue = true;
                    } else {
                        scope.attributes.toolbar.collapsed.designValue = false;
                    }
                }

                scope.checkCollapses = function() {
                    if ( !scope.attributes.toolbar.hasOwnProperty('collapsed') ) {
                        var addCollapsed = { "collapsed": { "value": "false" }};
                        scope.attributes.toolbar.collapsed = addCollapsed.collapsed;
                    }
                    if ( !scope.attributes.toolbar.hasOwnProperty('collapsible') ) {
                        var addCollapsible = { "collapsible": { "value": "false" }};
                        scope.attributes.toolbar.collapsible = addCollapsible.collapsible;
                    }
                }

                scope.checkCollapses();

                if (angular.isDefined(attrs.dfxGcDesign)) {
                    $timeout(function(){
                        scope.checkPanelBody();
                    }, 0);
                }
            });
        }
    }
}]);

dfxGControls.directive('dfxGcWebMytoolbar', function() {
    return {
        restrict: 'A',
        require: '^dfxGcWebBase',
        scope: {},
        templateUrl: function( el, attrs ) {
            if (angular.isDefined(attrs.dfxGcEdit)) {
                return '/gcontrols/web/mytoolbar_edit.html';
            } else if (angular.isDefined(attrs.dfxGcDesign)) {
                return '/gcontrols/web/mytoolbar_design.html';
            } else {
                return '/gcontrols/web/mytoolbar.html';
            }
        },
        link: function(scope, element, attrs) {
            var component = scope.$parent.getComponent(element);
            basectrl.init(scope, element, component, attrs, 'mytoolbar');
        }
    }
});

dfxGControls.directive('dfxGcWebToolbar', function($sce, $compile, $timeout) {
    return {
        restrict: 'A',
        replace: true,
        transclude : true,
        templateUrl: function( el, attrs) {
            return '/gcontrols/web/toolbar_preview.html';
        },
        link: function(scope, element, attrs) {
            scope.mainToolbarInitCounter = 0;
            scope.toolbarInitCounter = 0;
            scope.$gcscope = scope;

            scope.$watch('$parent.gc_instances', function(newVal){
                if(newVal){
                    var parentPanel = (newVal[Object.keys(newVal)[0]].attributes) ;
                    if(parentPanel.initialized){
                        if(parentPanel.initialized.value=== true && scope.mainToolbarInitCounter ===0){
                            scope.mainToolbarInitCounter++;
                            scope.runToolbar();
                        }
                    }
                }
            }, true);

            scope.$watch('$parent.gcontrol.attributes', function(newVal){
                if(newVal){
                    if(newVal.initialized){
                        if(newVal.initialized.value === true && scope.toolbarInitCounter ===0){
                            scope.toolbarInitCounter++;
                            scope.runToolbar();
                        }
                    }
                }
            }, true);

            scope.runToolbar = function(){
                $timeout(function(){
                    scope.attributes.toolbar.rightMenu.initialClick.value = false;
                    scope.attributes.toolbar.leftMenu.initialClick.value = false;

                    if(scope.attributes.toolbar.leftMenu.dynamicPresent.value && scope.attributes.toolbar.leftMenu.dynamic.value !==''){
                        scope.leftItems = eval('scope.' + scope.attributes.toolbar.leftMenu.dynamic.value);
                        try{
                            if(scope.leftItems.constructor === Array ){
                                if(scope.leftItems.length > 0){
                                    scope.attributes.toolbar.leftMenu.dynamicPresent.value = true;
                                }else{
                                    scope.attributes.toolbar.leftMenu.dynamicPresent.value = false;
                                }
                            }else{
                                scope.attributes.toolbar.leftMenu.dynamicPresent.value = false;
                            }
                        }catch(e){
                            scope.attributes.toolbar.leftMenu.dynamicPresent.value = false;
                        }

                    }else{
                        scope.attributes.toolbar.leftMenu.dynamicPresent.value = false;
                    }

                    if(scope.attributes.toolbar.rightMenu.dynamicPresent.value && scope.attributes.toolbar.rightMenu.dynamic.value !==''){
                        scope.rightItems = eval('scope.' + scope.attributes.toolbar.rightMenu.dynamic.value);
                        try{
                            if(scope.rightItems.constructor === Array ){
                                if(scope.rightItems.length > 0){
                                    scope.attributes.toolbar.rightMenu.dynamicPresent.value = true;
                                }else{
                                    scope.attributes.toolbar.rightMenu.dynamicPresent.value = false;
                                }
                            }else{
                                scope.attributes.toolbar.rightMenu.dynamicPresent.value = false;
                            }
                        }catch(e){
                            scope.attributes.toolbar.rightMenu.dynamicPresent.value = false;
                        }

                    }else{
                        scope.attributes.toolbar.rightMenu.dynamicPresent.value = false;
                    }

                    if(scope.attributes.layoutType.value === 'panel'){
                        var elem = '#' + scope.component_id ;
                        $(elem).addClass('flex') ;
                    }

                    if(scope.attributes.toolbar.title.isHtml.value){
                        var html_title = '#' + scope.component_id + '_toolbar_bindingHtml';
                        $compile($(html_title).contents())(scope);
                    }

                    if(scope.attributes.toolbar.rightMenu.type.value === 'Icon Bar'){
                        scope.iconbarBuilder('right');
                    }else if(scope.attributes.toolbar.rightMenu.type.value === 'Buttons'){
                        scope.iconbarBuilder('right');
                    }

                    if(scope.attributes.toolbar.leftMenu.type.value === 'Icon Bar'){
                        scope.iconbarBuilder('left');
                    }else if(scope.attributes.toolbar.leftMenu.type.value === 'Buttons'){
                        scope.iconbarBuilder('left');
                    }
                },0);
            };

            scope.setButtonsWidth = function(isEqual, side){
                $timeout(function(){
                    if(side==='right'){
                        var parentDiv = '.' + scope.component_id + '_toolbar_right_menu';
                    }else{
                        var parentDiv = '.' + scope.component_id + '_toolbar_left_menu';
                    }

                    if(isEqual && side==='right'){
                        var counter = 0;
                        for(var i =0; i < scope.attributes.toolbar.rightMenu.menuItems.value.length; i++){
                            if(!scope.attributes.toolbar.rightMenu.menuItems.value[i].divider){
                                counter++;
                            }
                        }
                        var percentValue = Math.floor(100/counter);
                        if(percentValue > 5){
                            $(parentDiv).css('width', '100%');
                            $($(parentDiv).find('md-menu-bar')[0]).children().css('width', (percentValue+'%'));
                        }else{
                            $(parentDiv).css('width', '');
                            $($(parentDiv).find('md-menu-bar')[0]).children().css('width', '');
                        }
                    }else if(isEqual && side==='left'){
                        var counter = 0;
                        for(var i =0; i < scope.attributes.toolbar.leftMenu.menuItems.value.length; i++){
                            if(!scope.attributes.toolbar.leftMenu.menuItems.value[i].divider){
                                counter++;
                            }
                        }
                        var percentValue = Math.floor(100/counter);
                        if(percentValue > 5){
                            $(parentDiv).css('width', '100%');
                            $($(parentDiv).find('md-menu-bar')[0]).children().css('width', (percentValue+'%'));
                        }
                    }else{
                        $(parentDiv).css('width', '');
                        $($(parentDiv).find('md-menu-bar')[0]).children().css('width', '');
                    }
                }, 0);
            };
            var singleMenuItem = '', toolbarType='', iconbarMenuItem = '<md-menu-item ng-if="{{itemDisplay}}">';
            var rebuildIcons = function( menuItems ) {
                for ( var i = 0; i < menuItems.length; i++ ) {
                    if ( typeof menuItems[i].icon === 'string' ) {
                        var tempIco = menuItems[i].icon;
                        menuItems[i].icon = {
                            "value": tempIco,
                            "type": menuItems[i].hasOwnProperty('iconType') ? menuItems[i].iconType : 'fa-icon'
                        }
                    }
                    if ( menuItems[i].menuItems.value.length > 0 ) {
                        rebuildIcons( menuItems[i].menuItems.value );
                    }
                }
            }
            scope.cleanFabClasses = function( fab ){
                if ( fab.class.indexOf('md-fab') > -1 ) { fab.class = fab.class.replace('md-fab', ""); }
                if ( fab.class.indexOf('md-raised') > -1 ) { fab.class = fab.class.replace('md-raised', ""); }
                if ( fab.class.indexOf('md-primary') > -1 ) { fab.class = fab.class.replace('md-primary', ""); }
                if ( fab.class.indexOf('md-mini') > -1 ) { fab.class = fab.class.replace('md-mini', ""); }
            }
            $timeout(function() {
                rebuildIcons( scope.attributes.toolbar.leftMenu.menuItems.value );
                rebuildIcons( scope.attributes.toolbar.rightMenu.menuItems.value );
                scope.cleanFabClasses(scope.attributes.toolbar.leftMenu.fab.triggerButton);
                scope.cleanFabClasses(scope.attributes.toolbar.leftMenu.fab.actionButton);
                scope.cleanFabClasses(scope.attributes.toolbar.rightMenu.fab.triggerButton);
                scope.cleanFabClasses(scope.attributes.toolbar.rightMenu.fab.actionButton);

                if ( !scope.attributes.toolbar.leftMenu.fab.triggerButton.icon.hasOwnProperty('size') ) {
                    scope.attributes.toolbar.leftMenu.fab.triggerButton.label = "";
                    scope.attributes.toolbar.leftMenu.fab.triggerButton.style = "";
                    scope.attributes.toolbar.leftMenu.fab.triggerButton.tooltip = { "direction": "top", "style": "", "class": "" };
                    scope.attributes.toolbar.leftMenu.fab.triggerButton.icon = { "size" : 24, "style": "", "class": "", "value": "'fa-bars'", "type" : "fa-icon" }
                }
                if ( !scope.attributes.toolbar.rightMenu.fab.triggerButton.icon.hasOwnProperty('size') ) {
                    scope.attributes.toolbar.rightMenu.fab.triggerButton.label = "";
                    scope.attributes.toolbar.rightMenu.fab.triggerButton.style = "";
                    scope.attributes.toolbar.rightMenu.fab.triggerButton.tooltip = { "direction": "top", "style": "", "class": "" };
                    scope.attributes.toolbar.rightMenu.fab.triggerButton.icon = { "size" : 24, "style": "", "class": "", "value": "'fa-bars'", "type" : "fa-icon" }
                }
                if ( !scope.attributes.toolbar.leftMenu.fab.actionButton.icon.hasOwnProperty('size') ) {
                    scope.attributes.toolbar.leftMenu.fab.actionButton.style = "";
                    scope.attributes.toolbar.leftMenu.fab.actionButton.icon = { "size" : 20, "style": "", "class": "" };
                    scope.attributes.toolbar.leftMenu.fab.actionButton.tooltip = { "direction": "top", "style": "", "class": "" };
                }
                if ( !scope.attributes.toolbar.rightMenu.fab.actionButton.icon.hasOwnProperty('size') ) {
                    scope.attributes.toolbar.rightMenu.fab.actionButton.style = "";
                    scope.attributes.toolbar.rightMenu.fab.actionButton.icon = { "size" : 20, "style": "", "class": "" };
                    scope.attributes.toolbar.rightMenu.fab.actionButton.tooltip = { "direction": "top", "style": "", "class": "" };
                }

                if ( !scope.attributes.toolbar.leftMenu.hasOwnProperty('iconBar') ) {
                    scope.attributes.toolbar.leftMenu.iconBar = {
                        "triggerButton": { "style": "", "class": "", "icon": { "size": 24, "style": "", "class": "" } },
                        "actionButton": { "style": "", "class": "", "icon": { "size": 16, "style": "", "class": "" } }
                    }
                    scope.attributes.toolbar.leftMenu.buttons = {
                        "triggerButton": { "style": "", "class": "", "icon": { "size": 20, "style": "", "class": "" } },
                        "actionButton": { "style": "", "class": "", "icon": { "size": 16, "style": "", "class": "" } }
                    }
                    delete scope.attributes.toolbar.leftMenu.buttonStyle;
                    delete scope.attributes.toolbar.leftMenu.iconStyle;
                }
                if ( !scope.attributes.toolbar.rightMenu.hasOwnProperty('iconBar') ) {
                    scope.attributes.toolbar.rightMenu.iconBar = {
                        "triggerButton": { "style": "", "class": "", "icon": { "size": 24, "style": "", "class": "" } },
                        "actionButton": { "style": "", "class": "", "icon": { "size": 16, "style": "", "class": "" } }
                    }
                    scope.attributes.toolbar.rightMenu.buttons = {
                        "triggerButton": { "style": "", "class": "", "icon": { "size": 20, "style": "", "class": "" } },
                        "actionButton": { "style": "", "class": "", "icon": { "size": 16, "style": "", "class": "" } }
                    }
                    delete scope.attributes.toolbar.rightMenu.buttonStyle;
                    delete scope.attributes.toolbar.rightMenu.iconStyle;
                }
            }, 0);

            scope.changeState = function( itemIndexes, ev, side ) {
                var levels = JSON.parse('['+itemIndexes+']');
                var bridge = '.menuItems.value', stateElement = '', stateObject = {};
                for ( var i = 0; i < levels.length; i++ ) {
                    if ( i === 0 ) {
                        stateElement = stateElement + '['+ levels[i] + ']';
                    } else {
                        stateElement = stateElement + bridge + '['+ levels[i] + ']';
                    }
                }
                switch ( side ) {
                    case 'left':
                        if ( scope.attributes.toolbar.leftMenu.dynamicPresent.value ) {
                            stateObject = eval('scope.leftItems'+stateElement).state;
                        } else {
                            stateObject = eval('scope.attributes.toolbar.leftMenu.menuItems.value'+stateElement).state;
                        }
                        break;
                    case 'right':
                        if ( scope.attributes.toolbar.rightMenu.dynamicPresent.value ) {
                            stateObject = eval('scope.rightItems'+stateElement).state;
                        } else {
                            stateObject = eval('scope.attributes.toolbar.rightMenu.menuItems.value'+stateElement).state;
                        }
                        break;
                }
                if (!angular.isDefined(attrs.dfxGcEdit) && !angular.isDefined(attrs.dfxGcDesign) && stateObject.binding !== '') {
                    if ( stateObject.binding === 'true' || stateObject.binding === 'false' ) {
                        switch ( stateObject.binding ) {
                            case 'true': stateObject.icon = stateObject.uncheckedIcon; stateObject.binding = 'false'; break;
                            case 'false': stateObject.icon = stateObject.checkedIcon; stateObject.binding = 'true'; break;
                        }
                        $timeout(function(){
                            var clickedSatateIcon = '', clickedEl;
                            if ( $(ev.target).is("button") ) { clickedEl = $(ev.target); }
                            else if ( $(ev.target).parent().is("button") ) { clickedEl = $(ev.target).parent(); }
                            else if ( $(ev.target).parent().parent().is("button") ) { clickedEl = $(ev.target).parent().parent(); }
                            if ( stateObject.icon.type === 'svg-icon' ) {
                                clickedSatateIcon = '<ng-md-icon icon="{{'+stateObject.icon.value+'}}" size="16" class="dfx-menu-button-icon '+stateObject.icon.class+'" style="'+stateObject.icon.style+'"></ng-md-icon>';
                            } else {
                                clickedSatateIcon = '<md-icon class="fa {{'+stateObject.icon.value+'}} dfx-menu-button-icon '+stateObject.icon.class+'" style="'+stateObject.icon.style+'"></md-icon>';
                            }
                            if ( stateObject.icon.value.length>0 ) {
                                $(clickedEl).find('i').empty().html(clickedSatateIcon);
                                $compile($(clickedEl).find('i').contents())(scope);
                            } else {
                                $(clickedEl).find('i').empty();
                            }
                        }, 0);
                    } else {
                        if ( scope.$gcscope[stateObject.binding] === 'true' || scope.$gcscope[stateObject.binding] === 'false' ) {
                            switch ( scope.$gcscope[stateObject.binding] ) {
                                case 'true': stateObject.icon = stateObject.uncheckedIcon; scope.$gcscope[stateObject.binding] = 'false'; break;
                                case 'false': stateObject.icon = stateObject.checkedIcon; scope.$gcscope[stateObject.binding] = 'true'; break;
                            }
                        } else if ( scope.$gcscope[stateObject.binding] ) {
                            stateObject.icon = stateObject.uncheckedIcon; scope.$gcscope[stateObject.binding] = false;
                        } else if ( !scope.$gcscope[stateObject.binding] ) {
                            stateObject.icon = stateObject.checkedIcon; scope.$gcscope[stateObject.binding] = true;
                        }
                    }
                }
            }
            var setState = function( stateObject ) {
                if (!angular.isDefined(attrs.dfxGcEdit) && !angular.isDefined(attrs.dfxGcDesign)) {
                    if ( stateObject.binding === 'true' || stateObject.binding === 'false' ) {
                        switch ( stateObject.binding ) {
                            case 'true': stateObject.icon = stateObject.checkedIcon; break;
                            case 'false': stateObject.icon = stateObject.uncheckedIcon; break;
                        }
                    } else {
                        if ( scope.$gcscope[stateObject.binding] === 'true' || scope.$gcscope[stateObject.binding] === 'false' ) {
                            switch ( scope.$gcscope[stateObject.binding] ) {
                                case 'true': stateObject.icon = stateObject.checkedIcon; break;
                                case 'false': stateObject.icon = stateObject.uncheckedIcon; break;
                            }
                        } else if ( scope.$gcscope[stateObject.binding] ) { stateObject.icon = stateObject.checkedIcon;
                        } else if ( !scope.$gcscope[stateObject.binding] ) { stateObject.icon = stateObject.uncheckedIcon;
                        }
                    }
                } else {
                    stateObject.icon = stateObject.checkedIcon;
                }
            }

            var buildNextLevel = function( nextLevel, road, side ) {
                for ( var i = 0; i < nextLevel.length; i++ ) {
                    if ( nextLevel[i].menuItems.value.length > 0 ) {
                        var iconbarItem = iconbarMenuItem.replace('{{itemDisplay}}', typeof nextLevel[i].display === 'string' ? nextLevel[i].display.replace(/"/g, '\'') : nextLevel[i].display);
                        scope.iconBar = scope.iconBar + iconbarItem + '<md-menu>';
                        createDfxMenuItem( nextLevel[i], 'singleMenuItem', road, i, side );
                        buildNextLevel( nextLevel[i].menuItems.value, road + ',' + i, side );
                        scope.iconBar = scope.iconBar + '</md-menu-content></md-menu></md-menu-item>';
                    }else {
                        if ( nextLevel[i].divider === true ) {
                            scope.iconBar = scope.iconBar + '<md-menu-divider></md-menu-divider>';
                        } else {
                            var iconbarItem = iconbarMenuItem.replace('{{itemDisplay}}', typeof nextLevel[i].display === 'string' ? nextLevel[i].display.replace(/"/g, '\'') : nextLevel[i].display);
                            scope.iconBar = scope.iconBar + iconbarItem;
                            createDfxMenuItem( nextLevel[i], 'singleMenuItem', road, i, side );
                        }
                    }
                }
            }

            var createDfxMenuItem = function( dfxMenuItem, type, level, index, side ) {
                if ( typeof dfxMenuItem.icon === 'string' ) {
                    var tempIcon = dfxMenuItem.icon;
                    dfxMenuItem.icon = {
                        "value": tempIcon,
                        "type":  dfxMenuItem.hasOwnProperty('iconType') ? dfxMenuItem.iconType : 'fa-icon'
                    }
                }
                var tempPropObject = {};
                tempPropObject.faIcon =                 dfxMenuItem.icon.value.indexOf("'") == -1 ? '{{'+dfxMenuItem.icon.value+'}}' : eval(dfxMenuItem.icon.value);
                tempPropObject.svgIcon =                dfxMenuItem.icon.value.indexOf("'") == -1 ? '{{'+dfxMenuItem.icon.value+'}}' : eval(dfxMenuItem.icon.value);
                tempPropObject.faItemIndex =            level >= 0 ? level + ',' + index : index;
                tempPropObject.itemLabel =              '{{'+dfxMenuItem.label+'}}';
                tempPropObject.itemIndex =              level || level >= 0 ? level + ',' + index : index;
                tempPropObject.itemDisabled =           dfxMenuItem.disabled;
                tempPropObject.itemDisplay =            typeof dfxMenuItem.display === 'string' ? dfxMenuItem.display.replace(/"/g, '\'') : dfxMenuItem.display;
                tempPropObject.itemClick =              dfxMenuItem.menuItems.value.length > 0 ? '$mdOpenMenu();'+dfxMenuItem.onclick : 'unfocusButton($event);'+dfxMenuItem.onclick;
                if ( type === 'singleMenuItem' ) {
                    tempPropObject.itemShortcut =       dfxMenuItem.shortcut;
                    tempPropObject.ifItemNotification = dfxMenuItem.notification !=='' ? true : false;
                    tempPropObject.itemNotification =   '{{'+dfxMenuItem.notification+'}}';
                }
                if ( toolbarType==='iconBar' ) {
                    if ( dfxMenuItem.hasOwnProperty('waiting')) { delete dfxMenuItem.waiting; }
                    if ( !dfxMenuItem.hasOwnProperty('state') ) {
                        dfxMenuItem.state = {
                            "value":           false,
                            "binding":         "true",
                            "icon":          { "value": "'thumb_up'", "type": "svg-icon", "style": "", "class": "" },
                            "checkedIcon":   { "value": "'thumb_up'", "type": "svg-icon", "style": "", "class": "" },
                            "uncheckedIcon": { "value": "'thumb_down'", "type": "svg-icon", "style": "", "class": "" }
                        };
                    }
                    if ( dfxMenuItem.state.value ) { setState( dfxMenuItem.state ); }
                    tempPropObject.ifFaIcon =               dfxMenuItem.icon.value.length > 0 && dfxMenuItem.icon.type === 'fa-icon' && !dfxMenuItem.state.value ? true : false;
                    tempPropObject.ifSvgIcon =              dfxMenuItem.icon.value.length > 0 && dfxMenuItem.icon.type === 'svg-icon' && !dfxMenuItem.state.value ? true : false;
                    tempPropObject.ifStateFaIcon =          dfxMenuItem.state.icon.value.length > 0 && dfxMenuItem.state.icon.type === 'fa-icon' && dfxMenuItem.state.value ? true : false;
                    tempPropObject.ifStateSvgIcon =         dfxMenuItem.state.icon.value.length > 0 && dfxMenuItem.state.icon.type === 'svg-icon' && dfxMenuItem.state.value ? true : false;
                    tempPropObject.stateFaIcon =            dfxMenuItem.state.icon.value.indexOf("'") == -1 ? '{{'+dfxMenuItem.state.icon.value+'}}' : eval(dfxMenuItem.state.icon.value);
                    tempPropObject.stateSvgIcon =           dfxMenuItem.state.icon.value.indexOf("'") == -1 ? '{{'+dfxMenuItem.state.icon.value+'}}' : eval(dfxMenuItem.state.icon.value);
                    tempPropObject.stateFaIconStyle =       dfxMenuItem.state.icon.style;
                    tempPropObject.stateSvgIconStyle =      dfxMenuItem.state.icon.style;
                    tempPropObject.stateFaIconClass =       dfxMenuItem.state.icon.class;
                    tempPropObject.stateSvgIconClass =      dfxMenuItem.state.icon.class;
                    if ( dfxMenuItem.menuItems.value.length > 0 ) {
                        tempPropObject.itemClick = dfxMenuItem.state.value ? '$mdOpenMenu();changeState('+"'"+tempPropObject.itemIndex+"'"+', $event, '+"'"+side+"'"+');'+dfxMenuItem.onclick : '$mdOpenMenu();'+dfxMenuItem.onclick;
                    } else {
                        tempPropObject.itemClick = dfxMenuItem.state.value ? 'changeState('+"'"+tempPropObject.itemIndex+"'"+', $event, '+"'"+side+"'"+');unfocusButton($event);'+dfxMenuItem.onclick : 'unfocusButton($event);'+dfxMenuItem.onclick;
                    }
                } else if (  toolbarType==='buttons' ) {
                    scope.waitableItem = { "value": false };
                    if ( dfxMenuItem.hasOwnProperty('state')) { delete dfxMenuItem.state; }
                    if ( typeof level === 'undefined' ) {
                        scope.waitableItem.value = true;
                        if ( !dfxMenuItem.hasOwnProperty('waiting') ) {
                            dfxMenuItem.waiting = {
                                "value": "", "autoDisabled": false,
                                "icon": { "value": "'fa-spinner'", "type": "fa-icon", "style": "", "class": "fa-pulse" }
                            }
                        }
                    } else {
                        scope.waitableItem.value = false;
                        if ( dfxMenuItem.hasOwnProperty('waiting')) { delete dfxMenuItem.waiting; }
                    }
                    if ( type === 'singleMenuItem' ) {
                        tempPropObject.ifFaIcon =              dfxMenuItem.icon.value.length > 0 && dfxMenuItem.icon.type === 'fa-icon' ? true : false;
                        tempPropObject.ifSvgIcon =             dfxMenuItem.icon.value.length > 0 && dfxMenuItem.icon.type === 'svg-icon' ? true : false;
                    } else {
                        tempPropObject.isAutoDisabled =        dfxMenuItem.waiting.autoDisabled.length>0 ? dfxMenuItem.waiting.autoDisabled : false;
                        tempPropObject.ifWaitClass =           dfxMenuItem.waiting.value.length>0 ? dfxMenuItem.waiting.value : false;
                        tempPropObject.ifNotWait =             dfxMenuItem.waiting.value.length>0 ? dfxMenuItem.waiting.value : false;
                        tempPropObject.ifWait =                dfxMenuItem.waiting.value.length>0 ? dfxMenuItem.waiting.value : false;
                        tempPropObject.ifFaIcon =              dfxMenuItem.icon.value.length > 0 && dfxMenuItem.icon.type === 'fa-icon' ? true : false;
                        tempPropObject.ifSvgIcon =             dfxMenuItem.icon.value.length > 0 && dfxMenuItem.icon.type === 'svg-icon' ? true : false;
                        tempPropObject.ifWaitFaIcon =          dfxMenuItem.waiting.icon.value.length > 0 && dfxMenuItem.waiting.icon.type === 'fa-icon' ? true : false;
                        tempPropObject.ifWaitSvgIcon =         dfxMenuItem.waiting.icon.value.length > 0 && dfxMenuItem.waiting.icon.type === 'svg-icon' ? true : false;
                        tempPropObject.waitFaIcon =            dfxMenuItem.waiting.icon.value.indexOf("'") == -1 ? 'fa-spinner' : eval(dfxMenuItem.waiting.icon.value);
                        tempPropObject.waitSvgIcon =           dfxMenuItem.waiting.icon.value.indexOf("'") == -1 ? 'track_changes' : eval(dfxMenuItem.waiting.icon.value);
                        tempPropObject.waitFaIconStyle =       dfxMenuItem.waiting.icon.style;
                        tempPropObject.waitSvgIconStyle =      dfxMenuItem.waiting.icon.style;
                        tempPropObject.waitFaIconClass =       dfxMenuItem.waiting.icon.class;
                        tempPropObject.waitSvgIconClass =      dfxMenuItem.waiting.icon.class;
                    }
                }
                var tempMenu = '';
                if ( type === 'singleMenuItem' ) {
                    tempMenu = singleMenuItem
                        .replace('{{ifFaIcon}}',           tempPropObject.ifFaIcon )
                        .replace('{{ifSvgIcon}}',          tempPropObject.ifSvgIcon )
                        .replace('{{ifStateFaIcon}}',      tempPropObject.ifStateFaIcon )
                        .replace('{{ifStateSvgIcon}}',     tempPropObject.ifStateSvgIcon )
                        .replace('{{faIcon}}',             tempPropObject.faIcon )
                        .replace('{{svgIcon}}',            tempPropObject.svgIcon )
                        .replace('{{stateFaIcon}}',        tempPropObject.stateFaIcon )
                        .replace('{{stateSvgIcon}}',       tempPropObject.stateSvgIcon )
                        .replace('{{stateFaIconStyle}}',   tempPropObject.stateFaIconStyle )
                        .replace('{{stateSvgIconStyle}}',  tempPropObject.stateSvgIconStyle )
                        .replace('{{stateFaIconClass}}',   tempPropObject.stateFaIconClass )
                        .replace('{{stateSvgIconClass}}',  tempPropObject.stateSvgIconClass )
                        .replace('{{itemLabel}}',          tempPropObject.itemLabel )
                        .replace('{{itemShortcut}}',       tempPropObject.itemShortcut )
                        .replace('{{ifItemNotification}}', tempPropObject.ifItemNotification )
                        .replace('{{itemNotification}}',   tempPropObject.itemNotification )
                        .replace('{{itemIndex}}',          tempPropObject.itemIndex )
                        .replace('{{itemDisplay}}',        tempPropObject.itemDisplay )
                        .replace('{{itemDisabled}}',       tempPropObject.itemDisabled )
                        .replace('{{itemClick}}',          tempPropObject.itemClick );
                } else {
                    tempMenu = scope.rootMenuItem
                        .replace('{{ifFaIcon}}',           tempPropObject.ifFaIcon )
                        .replace('{{ifSvgIcon}}',          tempPropObject.ifSvgIcon )
                        .replace('{{ifStateFaIcon}}',      tempPropObject.ifStateFaIcon )
                        .replace('{{ifStateSvgIcon}}',     tempPropObject.ifStateSvgIcon )
                        .replace('{{ifWaitFaIcon}}',       tempPropObject.ifWaitFaIcon )
                        .replace('{{ifWaitSvgIcon}}',      tempPropObject.ifWaitSvgIcon )
                        .replace('{{faIcon}}',             tempPropObject.faIcon )
                        .replace('{{svgIcon}}',            tempPropObject.svgIcon )
                        .replace('{{stateFaIcon}}',        tempPropObject.stateFaIcon )
                        .replace('{{stateSvgIcon}}',       tempPropObject.stateSvgIcon )
                        .replace('{{stateFaIconStyle}}',   tempPropObject.stateFaIconStyle )
                        .replace('{{stateSvgIconStyle}}',  tempPropObject.stateSvgIconStyle )
                        .replace('{{stateFaIconClass}}',   tempPropObject.stateFaIconClass )
                        .replace('{{stateSvgIconClass}}',  tempPropObject.stateSvgIconClass )
                        .replace('{{isAutoDisabled}}',     tempPropObject.isAutoDisabled )
                        .replace('{{ifNotWait}}',          tempPropObject.ifNotWait )
                        .replace('{{ifWait}}',             tempPropObject.ifWait )
                        .replace('{{ifWaitClass}}',        tempPropObject.ifWaitClass )
                        .replace('{{waitFaIcon}}',         tempPropObject.waitFaIcon )
                        .replace('{{waitSvgIcon}}',        tempPropObject.waitSvgIcon )
                        .replace('{{waitFaIconStyle}}',    tempPropObject.waitFaIconStyle )
                        .replace('{{waitSvgIconStyle}}',   tempPropObject.waitSvgIconStyle )
                        .replace('{{waitFaIconClass}}',    tempPropObject.waitFaIconClass )
                        .replace('{{waitSvgIconClass}}',   tempPropObject.waitSvgIconClass )
                        .replace('{{itemLabel}}',          tempPropObject.itemLabel )
                        .replace('{{itemIndex}}',          tempPropObject.itemIndex )
                        .replace('{{itemDisplay}}',        tempPropObject.itemDisplay )
                        .replace('{{itemDisabled}}',       tempPropObject.itemDisabled )
                        .replace('{{itemClick}}',          tempPropObject.itemClick );
                }
                if ( dfxMenuItem.menuItems.value.length > 0 ) {
                    scope.iconBar = scope.iconBar + tempMenu +'<md-menu-content width="4">';
                } else {
                    if ( type === 'singleMenuItem' ) {
                        scope.iconBar = scope.iconBar + tempMenu + '</md-menu-item>';
                    } else {
                        scope.iconBar = scope.iconBar + tempMenu + '<md-menu-content width="4"></md-menu-content>';
                    }
                }
            }

            scope.iconbarBuilder = function( side ) {
                $timeout(function() {
                    if ( side === 'left' ) {
                        if ( scope.attributes.toolbar.leftMenu.dynamicPresent.value ) {
                            scope.iconbarArray = scope.leftItems;
                        } else {
                            scope.iconbarArray = scope.attributes.toolbar.leftMenu.menuItems.value;
                        }
                        if ( scope.attributes.toolbar.leftMenu.type.value === 'Icon Bar' ) {
                            toolbarType='iconBar';
                            scope.leftRootMenuItem = '<button ng-click="{{itemClick}}" ng-show="{{itemDisplay}}" menu-index="{{itemIndex}}" ng-disabled="{{itemDisabled}}" style="{{attributes.toolbar.leftMenu.iconBar.triggerButton.style}}" aria-label="md-icon-button" class="md-icon-button {{attributes.toolbar.leftMenu.iconBar.triggerButton.class}}">'+
                            '<md-icon ng-if="{{ifFaIcon}}" class="fa {{faIcon}} dfx-core-gc-toolbar-left-menu-iconbar {{attributes.toolbar.leftMenu.iconBar.triggerButton.icon.class}}" style="font-size:{{attributes.toolbar.leftMenu.iconBar.triggerButton.icon.size}}px; {{attributes.toolbar.leftMenu.iconBar.triggerButton.icon.style}}"></md-icon>'+
                            '<ng-md-icon ng-if="{{ifSvgIcon}}" icon="{{svgIcon}}" size="{{attributes.toolbar.leftMenu.iconBar.triggerButton.icon.size}}" class="dfx-core-gc-toolbar-left-menu-iconbar {{attributes.toolbar.leftMenu.iconBar.triggerButton.icon.class}}" style="{{attributes.toolbar.leftMenu.iconBar.triggerButton.icon.style}}"></ng-md-icon>'+
                            '<md-icon ng-if="{{ifStateFaIcon}}" class="fa {{stateFaIcon}} dfx-core-gc-toolbar-left-menu-iconbar {{attributes.toolbar.leftMenu.iconBar.triggerButton.icon.class}} {{stateFaIconClass}}" style="font-size:{{attributes.toolbar.leftMenu.iconBar.triggerButton.icon.size}}px; {{attributes.toolbar.leftMenu.iconBar.triggerButton.icon.style}} {{stateFaIconStyle}}"></md-icon>'+
                            '<ng-md-icon ng-if="{{ifStateSvgIcon}}" icon="{{stateSvgIcon}}" size="{{attributes.toolbar.leftMenu.iconBar.triggerButton.icon.size}}" class="dfx-core-gc-toolbar-left-menu-iconbar {{attributes.toolbar.leftMenu.iconBar.triggerButton.icon.class}} {{stateSvgIconClass}}" style="{{attributes.toolbar.leftMenu.iconBar.triggerButton.icon.style}} {{stateSvgIconStyle}}"></ng-md-icon>'+
                            '</button>';
                            singleMenuItem ='<md-button ng-show="{{itemDisplay}}" ng-disabled="{{itemDisabled}}" menu-index="{{itemIndex}}" ng-click="{{itemClick}}" '+
                            'class="dfx-menu-button {{attributes.toolbar.leftMenu.iconBar.actionButton.class}}" style="{{attributes.toolbar.leftMenu.iconBar.actionButton.style}}" aria-label="iconbar-button" >'+
                            '<md-icon ng-if="{{ifFaIcon}}" class="fa {{faIcon}} dfx-menu-button-icon {{attributes.toolbar.leftMenu.iconBar.actionButton.icon.class}}" style="font-size:{{attributes.toolbar.leftMenu.iconBar.actionButton.icon.size}}px; {{attributes.toolbar.leftMenu.iconBar.actionButton.icon.style}}"></md-icon>'+
                            '<ng-md-icon ng-if="{{ifSvgIcon}}" icon="{{svgIcon}}" size="{{attributes.toolbar.leftMenu.iconBar.actionButton.icon.size}}" class="dfx-menu-button-icon {{attributes.toolbar.leftMenu.iconBar.actionButton.icon.class}}" style="{{attributes.toolbar.leftMenu.iconBar.actionButton.icon.style}}"></ng-md-icon>'+
                            '<i><md-icon ng-if="{{ifStateFaIcon}}" class="fa {{stateFaIcon}} dfx-menu-button-icon {{attributes.toolbar.leftMenu.iconBar.actionButton.icon.class}} {{stateFaIconClass}}" style="font-size:{{attributes.toolbar.leftMenu.iconBar.actionButton.icon.size}}px; {{attributes.toolbar.leftMenu.iconBar.actionButton.icon.style}} {{stateFaIconStyle}}"></md-icon>'+
                            '<ng-md-icon ng-if="{{ifStateSvgIcon}}" icon="{{stateSvgIcon}}" size="{{attributes.toolbar.leftMenu.iconBar.actionButton.icon.size}}" class="dfx-menu-button-icon {{attributes.toolbar.leftMenu.iconBar.actionButton.icon.class}} {{stateFaIconClass}}" style="{{attributes.toolbar.leftMenu.iconBar.actionButton.icon.style}} {{stateSvgIconStyle}}"></ng-md-icon></i>'+
                            '<span>{{itemLabel}}</span>'+
                            '<span class="md-alt-text">{{itemShortcut}}</span>'+
                            '<small ng-if="{{ifItemNotification}}">{{itemNotification}}</small>'+
                            '</md-button>';

                        } else if ( scope.attributes.toolbar.leftMenu.type.value === 'Buttons' ) {
                            toolbarType='buttons';
                            scope.leftRootMenuItem = '<button aria-label="left_buttons" ng-click="{{itemClick}}" style="width: 100%; {{attributes.toolbar.leftMenu.buttons.triggerButton.style}}"' +
                            'class="dfx-core-gc-button dfx-core-gc-toolbar-left-buttons md-button md-raised md-altTheme-theme glyph {{attributes.toolbar.leftMenu.buttons.triggerButton.class}} {{ {{ifWaitClass}} ? \'dfx-core-button-wait\' : \'\'}}" ng-disabled="{{itemDisabled}} || {{isAutoDisabled}}">'+
                            '<div ng-if="!{{ifNotWait}}">'+
                                '<md-icon ng-if="{{ifFaIcon}}" class="fa {{faIcon}} dfx-core-gc-toolbar-left-menu-icon {{attributes.toolbar.leftMenu.buttons.triggerButton.icon.class}}" style="font-size: {{attributes.toolbar.leftMenu.buttons.triggerButton.icon.size}}px; width: {{attributes.toolbar.leftMenu.buttons.triggerButton.icon.size}}px; height: {{attributes.toolbar.leftMenu.buttons.triggerButton.icon.size}}px; {{attributes.toolbar.leftMenu.buttons.triggerButton.icon.style}}"></md-icon>'+
                                '<ng-md-icon ng-if="{{ifSvgIcon}}" icon="{{svgIcon}}" size="{{attributes.toolbar.leftMenu.buttons.triggerButton.icon.size}}" class="dfx-core-gc-toolbar-left-menu-icon {{attributes.toolbar.leftMenu.buttons.triggerButton.icon.class}}" style="width: {{attributes.toolbar.leftMenu.buttons.triggerButton.icon.size}}px; height: {{attributes.toolbar.leftMenu.buttons.triggerButton.icon.size}}px;{{attributes.toolbar.leftMenu.buttons.triggerButton.icon.style}}"></ng-md-icon>'+
                            '</div>'+
                            '<div ng-if="{{ifWait}}">'+
                                '<md-icon ng-if="{{ifWaitFaIcon}}" class="fa {{waitFaIcon}} dfx-core-gc-toolbar-left-menu-icon {{attributes.toolbar.leftMenu.buttons.triggerButton.icon.class}} {{waitFaIconClass}}" style="font-size: {{attributes.toolbar.leftMenu.buttons.triggerButton.icon.size}}px; width: {{attributes.toolbar.leftMenu.buttons.triggerButton.icon.size}}px; height: {{attributes.toolbar.leftMenu.buttons.triggerButton.icon.size}}px;{{attributes.toolbar.leftMenu.buttons.triggerButton.icon.style}}; {{waitFaIconStyle}}"></md-icon>'+
                                '<ng-md-icon ng-if="{{ifWaitSvgIcon}}" icon="{{waitSvgIcon}}" size="{{attributes.toolbar.leftMenu.buttons.triggerButton.icon.size}}" class="dfx-core-gc-toolbar-left-menu-icon {{attributes.toolbar.leftMenu.buttons.triggerButton.icon.class}} {{waitSvgIconClass}}" style="width: {{attributes.toolbar.leftMenu.buttons.triggerButton.icon.size}}px; height: {{attributes.toolbar.leftMenu.buttons.triggerButton.icon.size}}px;{{attributes.toolbar.leftMenu.buttons.triggerButton.icon.style}}; {{waitSvgIconStyle}}"></ng-md-icon>'+
                            '</div>'+
                            '<span style="line-height: 20px;">{{itemLabel}}</span>'+
                            '</button>';
                            singleMenuItem ='<md-button ng-show="{{itemDisplay}}" ng-disabled="{{itemDisabled}}" menu-index="{{itemIndex}}" ng-click="{{itemClick}}" '+
                            'class="dfx-menu-button {{attributes.toolbar.leftMenu.buttons.actionButton.class}}" style="{{attributes.toolbar.leftMenu.buttons.actionButton.style}}" aria-label="buttons-button" >'+
                            '<md-icon ng-if="{{ifFaIcon}}" class="fa {{faIcon}} dfx-menu-button-icon {{attributes.toolbar.leftMenu.buttons.actionButton.icon.class}}" style="font-size:{{attributes.toolbar.leftMenu.buttons.actionButton.icon.size}}px; {{attributes.toolbar.leftMenu.buttons.actionButton.icon.style}}"></md-icon>'+
                            '<ng-md-icon ng-if="{{ifSvgIcon}}" icon="{{svgIcon}}" size="{{attributes.toolbar.leftMenu.buttons.actionButton.icon.size}}" class="dfx-menu-button-icon {{attributes.toolbar.leftMenu.buttons.actionButton.icon.class}}" style="{{attributes.toolbar.leftMenu.buttons.actionButton.icon.style}}"></ng-md-icon>'+
                            '<span>{{itemLabel}}</span>'+
                            '<span class="md-alt-text">{{itemShortcut}}</span>'+
                            '<small ng-if="{{ifItemNotification}}">{{itemNotification}}</small>'+
                            '</md-button>';
                        }
                        scope.rootMenuItem = scope.leftRootMenuItem;
                        if ( scope.attributes.toolbar.leftMenu.type.value === 'Buttons' ) {
                            scope.iconBar = '<md-menu-bar style="padding: 0">';
                        } else {
                            scope.iconBar = '<md-menu-bar>';
                        }
                    } else if ( side === 'right' ) {
                        if ( scope.attributes.toolbar.rightMenu.dynamicPresent.value ) {
                                scope.iconbarArray = scope.rightItems;
                            } else {
                                scope.iconbarArray = scope.attributes.toolbar.rightMenu.menuItems.value;
                            }
                        if ( scope.attributes.toolbar.rightMenu.type.value === 'Icon Bar' ) {
                            toolbarType='iconBar';
                            scope.rightRootMenuItem = '<button ng-click="{{itemClick}}" ng-show="{{itemDisplay}}" menu-index="{{itemIndex}}" ng-disabled="{{itemDisabled}}" style="{{attributes.toolbar.rightMenu.iconBar.triggerButton.style}}" aria-label="md-icon-button" class="md-icon-button {{attributes.toolbar.rightMenu.iconBar.triggerButton.class}}">'+
                            '<md-icon ng-if="{{ifFaIcon}}" class="fa {{faIcon}} dfx-core-gc-toolbar-right-menu-iconbar {{attributes.toolbar.rightMenu.iconBar.triggerButton.icon.class}}" style="font-size:{{attributes.toolbar.rightMenu.iconBar.triggerButton.icon.size}}px; {{attributes.toolbar.rightMenu.iconBar.triggerButton.icon.style}}"></md-icon>'+
                            '<ng-md-icon ng-if="{{ifSvgIcon}}" icon="{{svgIcon}}" size="{{attributes.toolbar.rightMenu.iconBar.triggerButton.icon.size}}" class="dfx-core-gc-toolbar-right-menu-iconbar {{attributes.toolbar.rightMenu.iconBar.triggerButton.icon.class}}" style="{{attributes.toolbar.rightMenu.iconBar.triggerButton.icon.style}}"></ng-md-icon>'+
                            '<md-icon ng-if="{{ifStateFaIcon}}" class="fa {{stateFaIcon}} dfx-core-gc-toolbar-right-menu-iconbar {{attributes.toolbar.rightMenu.iconBar.triggerButton.icon.class}} {{stateFaIconClass}}" style="font-size:{{attributes.toolbar.rightMenu.iconBar.triggerButton.icon.size}}px; {{attributes.toolbar.rightMenu.iconBar.triggerButton.icon.style}} {{stateFaIconStyle}}"></md-icon>'+
                            '<ng-md-icon ng-if="{{ifStateSvgIcon}}" icon="{{stateSvgIcon}}" size="{{attributes.toolbar.rightMenu.iconBar.triggerButton.icon.size}}" class="dfx-core-gc-toolbar-right-menu-iconbar {{attributes.toolbar.rightMenu.iconBar.triggerButton.icon.class}} {{stateSvgIconClass}}" style="{{attributes.toolbar.rightMenu.iconBar.triggerButton.icon.style}} {{stateSvgIconStyle}}"></ng-md-icon>'+
                            '</button>';
                            singleMenuItem ='<md-button ng-show="{{itemDisplay}}" ng-disabled="{{itemDisabled}}" menu-index="{{itemIndex}}" ng-click="{{itemClick}}" '+
                            'class="dfx-menu-button {{attributes.toolbar.rightMenu.iconBar.actionButton.class}}" style="{{attributes.toolbar.rightMenu.iconBar.actionButton.style}}" aria-label="iconbar-button" >'+
                            '<md-icon ng-if="{{ifFaIcon}}" class="fa {{faIcon}} dfx-menu-button-icon {{attributes.toolbar.rightMenu.iconBar.actionButton.icon.class}}" style="font-size:{{attributes.toolbar.rightMenu.iconBar.actionButton.icon.size}}px; {{attributes.toolbar.rightMenu.iconBar.actionButton.icon.style}}"></md-icon>'+
                            '<ng-md-icon ng-if="{{ifSvgIcon}}" icon="{{svgIcon}}" size="{{attributes.toolbar.rightMenu.iconBar.actionButton.icon.size}}" class="dfx-menu-button-icon {{attributes.toolbar.rightMenu.iconBar.actionButton.icon.class}}" style="{{attributes.toolbar.rightMenu.iconBar.actionButton.icon.style}}"></ng-md-icon>'+
                            '<i><md-icon ng-if="{{ifStateFaIcon}}" class="fa {{stateFaIcon}} dfx-menu-button-icon {{attributes.toolbar.rightMenu.iconBar.actionButton.icon.class}} {{stateFaIconClass}}" style="font-size:{{attributes.toolbar.rightMenu.iconBar.actionButton.icon.size}}px; {{attributes.toolbar.rightMenu.iconBar.actionButton.icon.style}} {{stateFaIconStyle}}"></md-icon>'+
                            '<ng-md-icon ng-if="{{ifStateSvgIcon}}" icon="{{stateSvgIcon}}" size="{{attributes.toolbar.rightMenu.iconBar.actionButton.icon.size}}" class="dfx-menu-button-icon {{attributes.toolbar.rightMenu.iconBar.actionButton.icon.class}} {{stateFaIconClass}}" style="{{attributes.toolbar.rightMenu.iconBar.actionButton.icon.style}} {{stateSvgIconStyle}}"></ng-md-icon></i>'+
                            '<span>{{itemLabel}}</span>'+
                            '<span class="md-alt-text">{{itemShortcut}}</span>'+
                            '<small ng-if="{{ifItemNotification}}">{{itemNotification}}</small>'+
                            '</md-button>';
                        } else if ( scope.attributes.toolbar.rightMenu.type.value === 'Buttons' ) {
                            toolbarType='buttons';
                            scope.rightRootMenuItem = '<button aria-label="right_buttons" ng-click="{{itemClick}}" style="width: 100%; {{attributes.toolbar.rightMenu.buttons.triggerButton.style}}" ' +
                            'class="dfx-core-gc-button dfx-core-gc-toolbar-right-buttons md-button md-raised md-altTheme-theme glyph {{attributes.toolbar.rightMenu.buttons.triggerButton.class}} {{ {{ifWaitClass}} ? \'dfx-core-button-wait\' : \'\'}}" ng-disabled="{{itemDisabled}} || {{isAutoDisabled}}">'+
                            '<div ng-if="!{{ifNotWait}}">'+
                                '<md-icon ng-if="{{ifFaIcon}}" class="fa {{faIcon}} dfx-core-gc-toolbar-right-menu-icon {{attributes.toolbar.rightMenu.buttons.triggerButton.icon.class}}" style="font-size: {{attributes.toolbar.rightMenu.buttons.triggerButton.icon.size}}px; width: {{attributes.toolbar.rightMenu.buttons.triggerButton.icon.size}}px; height: {{attributes.toolbar.rightMenu.buttons.triggerButton.icon.size}}px; {{attributes.toolbar.rightMenu.buttons.triggerButton.icon.style}}"></md-icon>'+
                                '<ng-md-icon ng-if="{{ifSvgIcon}}" icon="{{svgIcon}}" size="{{attributes.toolbar.rightMenu.buttons.triggerButton.icon.size}}" class="dfx-core-gc-toolbar-right-menu-icon {{attributes.toolbar.rightMenu.buttons.triggerButton.icon.class}}" style="width: {{attributes.toolbar.rightMenu.buttons.triggerButton.icon.size}}px; height: {{attributes.toolbar.rightMenu.buttons.triggerButton.icon.size}}px;{{attributes.toolbar.rightMenu.buttons.triggerButton.icon.style}}"></ng-md-icon>'+
                            '</div>'+
                            '<div ng-if="{{ifWait}}">'+
                                '<md-icon ng-if="{{ifWaitFaIcon}}" class="fa {{waitFaIcon}} dfx-core-gc-toolbar-right-menu-icon {{attributes.toolbar.rightMenu.buttons.triggerButton.icon.class}} {{waitFaIconClass}}" style="font-size: {{attributes.toolbar.rightMenu.buttons.triggerButton.icon.size}}px; width: {{attributes.toolbar.rightMenu.buttons.triggerButton.icon.size}}px; height: {{attributes.toolbar.rightMenu.buttons.triggerButton.icon.size}}px;{{attributes.toolbar.rightMenu.buttons.triggerButton.icon.style}}; {{waitFaIconStyle}}"></md-icon>'+
                                '<ng-md-icon ng-if="{{ifWaitSvgIcon}}" icon="{{waitSvgIcon}}" size="{{attributes.toolbar.rightMenu.buttons.triggerButton.icon.size}}" class="dfx-core-gc-toolbar-right-menu-icon {{attributes.toolbar.rightMenu.buttons.triggerButton.icon.class}} {{waitSvgIconClass}}" style="width: {{attributes.toolbar.rightMenu.buttons.triggerButton.icon.size}}px; height: {{attributes.toolbar.rightMenu.buttons.triggerButton.icon.size}}px;{{attributes.toolbar.rightMenu.buttons.triggerButton.icon.style}}; {{waitSvgIconStyle}}"></ng-md-icon>'+
                            '</div>'+
                            '<span style="line-height: 20px;">{{itemLabel}}</span></button>';
                            singleMenuItem ='<md-button ng-show="{{itemDisplay}}" ng-disabled="{{itemDisabled}}" menu-index="{{itemIndex}}" ng-click="{{itemClick}}" '+
                            'class="dfx-menu-button {{attributes.toolbar.rightMenu.buttons.actionButton.class}}" style="{{attributes.toolbar.rightMenu.buttons.actionButton.style}}" aria-label="buttons-button" >'+
                            '<md-icon ng-if="{{ifFaIcon}}" class="fa {{faIcon}} dfx-menu-button-icon {{attributes.toolbar.rightMenu.buttons.actionButton.icon.class}}" style="font-size:{{attributes.toolbar.rightMenu.buttons.actionButton.icon.size}}px; {{attributes.toolbar.rightMenu.buttons.actionButton.icon.style}}"></md-icon>'+
                            '<ng-md-icon ng-if="{{ifSvgIcon}}" icon="{{svgIcon}}" size="{{attributes.toolbar.rightMenu.buttons.actionButton.icon.size}}" class="dfx-menu-button-icon {{attributes.toolbar.rightMenu.buttons.actionButton.icon.class}}" style="{{attributes.toolbar.rightMenu.buttons.actionButton.icon.style}}"></ng-md-icon>'+
                            '<span>{{itemLabel}}</span>'+
                            '<span class="md-alt-text">{{itemShortcut}}</span>'+
                            '<small ng-if="{{ifItemNotification}}">{{itemNotification}}</small>'+
                            '</md-button>';
                        }
                        scope.rootMenuItem = scope.rightRootMenuItem;
                        if ( scope.attributes.toolbar.rightMenu.type.value === 'Buttons' ) {
                            scope.iconBar = '<md-menu-bar style="padding: 0">';
                        } else {
                            scope.iconBar = '<md-menu-bar>';
                        }
                    }

                    for ( var item = 0; item < scope.iconbarArray.length; item++ ) {
                        if ( side === 'left' ) {
                            if ( scope.attributes.toolbar.leftMenu.type.value === 'Buttons' ) {
                                scope.iconBar = scope.iconBar + '<md-menu class="toolbar-button" style="padding: 1px">';
                            } else {
                                scope.iconBar = scope.iconBar + '<md-menu>';
                            }
                        } else {
                            if ( scope.attributes.toolbar.rightMenu.type.value === 'Buttons' ) {
                                scope.iconBar = scope.iconBar + '<md-menu class="toolbar-button" style="padding: 1px">';
                            } else {
                                scope.iconBar = scope.iconBar + '<md-menu>';
                            }
                        }
                        if ( scope.iconbarArray[item].menuItems.value.length > 0 ) {
                            createDfxMenuItem( scope.iconbarArray[item], 'rootMenuItem', undefined, item, side );
                            buildNextLevel( scope.iconbarArray[item].menuItems.value, item, side);
                            scope.iconBar = scope.iconBar + '</md-menu-content>';
                        } else {
                            createDfxMenuItem( scope.iconbarArray[item], 'rootMenuItem', undefined, item, side );
                        }
                        scope.iconBar = scope.iconBar + '</md-menu>';
                    };
                    scope.iconBar = scope.iconBar + '</md-menu-bar>';
                    scope.iconBarMenu = scope.iconBar;
                    if(side==='left'){
                        if(scope.attributes.toolbar.leftMenu.type.value === 'Icon Bar'){
                            if ( scope.attributes.hasOwnProperty('repeat_in') && scope.attributes.repeat_title.value ) {
                                $('.' + scope.component_id + '_left_menu_bar[dfx-repeatable-panel='+attrs.dfxRepeatablePanel+']').html(scope.iconBarMenu);
                                $compile($('.' + scope.component_id + '_left_menu_bar[dfx-repeatable-panel='+attrs.dfxRepeatablePanel+']').contents())(scope);
                            } else {
                                $('.' + scope.component_id + '_left_menu_bar').html(scope.iconBarMenu);
                                $compile($('.' + scope.component_id + '_left_menu_bar').contents())(scope);
                            }
                        }else if(scope.attributes.toolbar.leftMenu.type.value === 'Buttons'){
                            if ( scope.attributes.hasOwnProperty('repeat_in') && scope.attributes.repeat_title.value ) {
                                $('.' + scope.component_id + '_left_buttons_menu[dfx-repeatable-panel='+attrs.dfxRepeatablePanel+']').html(scope.iconBarMenu);
                                $compile($('.' + scope.component_id + '_left_buttons_menu[dfx-repeatable-panel='+attrs.dfxRepeatablePanel+']').contents())(scope);
                            } else {
                                $('.' + scope.component_id + '_left_buttons_menu').html(scope.iconBarMenu);
                                $compile($('.' + scope.component_id + '_left_buttons_menu').contents())(scope);
                            }
                        }
                        scope.setButtonsWidth(scope.attributes.toolbar.leftMenu.equalButtonSize.value, 'left');
                    }else if(side==='right'){
                        if(scope.attributes.toolbar.rightMenu.type.value === 'Icon Bar'){
                            if ( scope.attributes.hasOwnProperty('repeat_in') && scope.attributes.repeat_title.value ) {
                                $('.' + scope.component_id + '_right_menu_bar[dfx-repeatable-panel='+attrs.dfxRepeatablePanel+']').html(scope.iconBarMenu);
                                $compile($('.' + scope.component_id + '_right_menu_bar[dfx-repeatable-panel='+attrs.dfxRepeatablePanel+']').contents())(scope);
                            } else {
                                $('.' + scope.component_id + '_right_menu_bar').html(scope.iconBarMenu);
                                $compile($('.' + scope.component_id + '_right_menu_bar').contents())(scope);
                            }
                        }else if(scope.attributes.toolbar.rightMenu.type.value === 'Buttons'){
                            if ( scope.attributes.hasOwnProperty('repeat_in') && scope.attributes.repeat_title.value ) {
                                $('.' + scope.component_id + '_right_buttons_menu[dfx-repeatable-panel='+attrs.dfxRepeatablePanel+']').html(scope.iconBarMenu);
                                $compile($('.' + scope.component_id + '_right_buttons_menu[dfx-repeatable-panel='+attrs.dfxRepeatablePanel+']').contents())(scope);
                            } else {
                                $('.' + scope.component_id + '_right_buttons_menu').html(scope.iconBarMenu);
                                $compile($('.' + scope.component_id + '_right_buttons_menu').contents())(scope);
                            }
                        }
                        scope.setButtonsWidth(scope.attributes.toolbar.rightMenu.equalButtonSize.value, 'right');
                    }
                }, 0);
            }

            scope.$watch('leftItems', function(newVal, oldVal) {
                if ( newVal != null && !angular.equals(newVal, oldVal) && scope.attributes.toolbar.leftMenu.type.value !== 'Fab' ) {
                    $timeout(function() {
                        scope.iconbarBuilder('left');
                    }, 0);
                }
            }, true);

            scope.$watch('rightItems', function(newVal, oldVal) {
                if ( newVal != null && !angular.equals(newVal, oldVal) && scope.attributes.toolbar.rightMenu.type.value !== 'Fab' ) {
                    $timeout(function() {
                        scope.iconbarBuilder('right items');
                    }, 0);
                }
            }, true);

            scope.$watch('attributes.toolbar.leftMenu.menuItems.value', function(newVal, oldVal) {
                if ( newVal != null && !angular.equals(newVal, oldVal) && scope.attributes.toolbar.leftMenu.type.value !== 'Fab' ) {
                    $timeout(function() {
                        scope.iconbarBuilder('left');
                    }, 0);
                }
            }, true);

            scope.$watch('attributes.toolbar.rightMenu.menuItems.value', function(newVal, oldVal) {
                if ( newVal != null && !angular.equals(newVal, oldVal) && scope.attributes.toolbar.rightMenu.type.value !== 'Fab' ) {
                    $timeout(function() {
                        scope.iconbarBuilder('right');
                    }, 0);
                }
            }, true);

            scope.unfocusButton = function(event){
                var target = $(event.target);
                if (target.is( "button" ) ) {
                    target.blur();
                }else{
                    $(target.parent()[0]).blur();
                }
            };

            // deleted form toolbar_preview.html md-fab-actions: ng-show="attributes.toolbar.rightMenu.initialClick.value === true"
            scope.rightFabClick = function(){
                //scope.attributes.toolbar.rightMenu.initialClick.value = true;
            };

            // deleted form toolbar_preview.html md-fab-actions: ng-show="attributes.toolbar.leftMenu.initialClick.value === true"
            scope.leftFabClick = function(){
                //scope.attributes.toolbar.leftMenu.initialClick.value = true;
            };

            scope.snippetTrustAsHtml = function(snippet) {
                return $sce.trustAsHtml(snippet);
            };
        }
    }
});

// dfxGControls.directive('dfxGcWebKnob', ['$timeout', function($timeout) {
//     return {
//         restrict:    'A',
//         require:     '^dfxGcWebBase',
//         scope:       true,
//         templateUrl: function (el, attrs) {
//             if (angular.isDefined(attrs.dfxGcEdit)) {
//                 return '/gcontrols/web/knob_edit.html';
//             } else if (angular.isDefined(attrs.dfxGcDesign)) {
//                 return '/gcontrols/web/knob_design.html';
//             } else {
//                 return '/gcontrols/web/knob.html';
//             }
//         },
//         link:        function (scope, element, attrs, basectrl) {
//             var component = scope.$parent.getComponent(element);

//             var getIntVal = function (strVal) {
//                 if (strVal) {
//                     return !isNaN(parseInt(strVal)) ? parseInt(strVal) : 0;
//                 } else {
//                     return 0;
//                 }
//             };
//             var getBooleanVal = function (strVal) {
//                 return (strVal) ? (strVal == 'true') : false;
//             };
//             var getIntValWithoutPx = function(value) {
//                 var result = value;
//                 if (result) {
//                     result = Number(result);
//                     if (! result) {
//                         var pxPos = value.indexOf('p');
//                         if (pxPos > -1) {
//                             result = value.substring(0, pxPos);
//                         }
//                     }
//                 }
//                 return result;
//             };
//             var getLabelStyle = function(width) {
//                 var minDefaultWidth = 52,
//                     actualWidth = getIntValWithoutPx(width),
//                     labelLeftMargin = parseInt(actualWidth / 7),
//                     labelPaddingDiff = actualWidth / minDefaultWidth > 1 ? actualWidth / minDefaultWidth * 2 : 0;

//                 labelLeftMargin += labelPaddingDiff;
//                 return 'margin-left:' + labelLeftMargin + 'px; display:block; text-align:';
//             };

//             basectrl.init(scope, element, component, attrs, 'knob').then(function () {
//                 if (!angular.isDefined(attrs.dfxGcEdit) && !angular.isDefined(attrs.dfxGcDesign)) { // RUN TIME
//                     scope.$gcscope = scope; // save a pointer to GC scope and in the scope itself to make it accessible later
//                     basectrl.bindScopeVariable(scope, component.attributes.binding.value);

//                     // watch scope variable bound to knob
//                     scope.$watch(scope.attributes.binding.value, function (newValue) {
//                         $('#' + scope.component_id).find('.knob').val(newValue).trigger('change');
//                     });
//                 } else { // DESIGN TIME

//                     var changeConfigParam = function(scope, paramName, newValue) {
//                         if (scope.attributes && newValue) {
//                             var configParams = {};
//                             configParams[paramName] = newValue;
//                             if (paramName == 'height' || paramName == 'width') {
//                                 configParams[paramName] = getIntValWithoutPx(newValue);
//                             }
//                             $('#' + scope.component_id).find('.knob').trigger('configure', configParams);
//                         }
//                     };
//                     scope.$watch('attributes.css.width', function (newValue) {
//                         changeConfigParam(scope, 'width', newValue);

//                         var labelStyle = getLabelStyle(newValue);
//                         $('#' + scope.component_id).find('label').attr('style', labelStyle + scope.attributes.selectedLabelPosition.value + ';');
//                     });
//                     scope.$watch('attributes.css.height', function (newValue) {
//                         changeConfigParam(scope, 'height', newValue);
//                     });
//                     scope.$watch('attributes.min.value', function (newValue) {
//                         changeConfigParam(scope, 'min', newValue);
//                     });
//                     scope.$watch('attributes.max.value', function (newValue) {
//                         changeConfigParam(scope, 'max', newValue);
//                     });
//                     scope.$watch('attributes.step.value', function (newValue) {
//                         changeConfigParam(scope, 'step', newValue);
//                     });
//                     scope.$watch('attributes.css.color', function (newValue) {
//                         changeConfigParam(scope, 'fgColor', newValue);
//                     });
//                     scope.$watch('attributes.css.background', function (newValue) {
//                         changeConfigParam(scope, 'bgColor', newValue);
//                     });

//                     scope.$watch('attributes.selectedLabelPosition.value', function (newValue) {
//                         if (scope.attributes) {
//                             var labelStyle = getLabelStyle(scope.attributes.css.width);
//                             $('#' + scope.component_id).find('label').attr('style', labelStyle + newValue + ';');
//                         }
//                     });
//                 }

//                 $timeout(function () {
//                     $('#' + scope.component_id).find('.knob').knob({
//                         min:     getIntVal(scope.attributes.min.value),
//                         max:     getIntVal(scope.attributes.max.value),
//                         step:    getIntVal(scope.attributes.step.value),
//                         readOnly: getBooleanVal(scope.attributes.disabled.value),
//                         value:    getIntVal(scope.attributes.binding.value),
//                         width:   getIntValWithoutPx(scope.attributes.css.width),
//                         height:  getIntValWithoutPx(scope.attributes.css.height),
//                         fgColor: scope.attributes.css.color,
//                         bgColor: scope.attributes.css.background || '#EEEEEE',
//                         draw:    function () {
//                             if (scope.attributes.selectedSymbolPosition.value && scope.attributes.symbol.value) {
//                                 var res = '',
//                                     val = getIntVal(scope.attributes.binding.value) || 50;

//                                 if (!angular.isDefined(attrs.dfxGcEdit) && !angular.isDefined(attrs.dfxGcDesign)) { // RUN TIME
//                                     val = scope.$gcscope[scope.attributes.binding.value];
//                                 }

//                                 if (scope.attributes.selectedSymbolPosition.value == 'left') {
//                                     res = scope.attributes.symbol.value + val;
//                                 } else if(scope.attributes.selectedSymbolPosition.value == 'right') {
//                                     res = val + scope.attributes.symbol.value;
//                                 }
//                                 $(this.i).val(res);
//                             }
//                         },
//                         change:  function (newValue) {
//                             if (!angular.isDefined(attrs.dfxGcEdit) && !angular.isDefined(attrs.dfxGcDesign)) { // RUN TIME
//                                 newValue = Math.round(newValue);

//                                 // change the bound scope variable if exists
//                                 scope.$apply(function () {
//                                     if (scope.$gcscope[scope.attributes.binding.value]) {
//                                         scope.$gcscope[scope.attributes.binding.value] = newValue;
//                                     }
//                                 });

//                                 // invoke onchange listener
//                                 var changeFunc = scope.attributes.onchange.value;
//                                 if (changeFunc) {
//                                     var bracketsPos = changeFunc.indexOf('(');
//                                     changeFunc      = (bracketsPos > -1) ? changeFunc.substring(0, bracketsPos) : changeFunc;
//                                     if (scope.$gcscope[changeFunc]) scope.$gcscope[changeFunc](newValue);
//                                 }
//                             }
//                         }
//                     });

//                     if (!angular.isDefined(attrs.dfxGcEdit) && !angular.isDefined(attrs.dfxGcDesign)) { // RUN TIME
//                         // set label position
//                         var labelStyle = getLabelStyle(scope.attributes.css.width);
//                         $('#' + scope.component_id).find('label').attr('style', labelStyle + scope.attributes.selectedLabelPosition.value + ';');
//                     }
//                 }, 0);
//             });
//         }
//     }
// }]);

dfxGControls.directive('dfxGcWebHtml', function($sce, $mdDialog, $compile, $parse, $timeout) {
    return {
        restrict: 'A',
        require: '^dfxGcWebBase',
        scope: true,
        templateUrl: function( el, attrs ) {
            if (angular.isDefined(attrs.dfxGcEdit)) {
                return '/gcontrols/web/html_edit.html';
            } else if (angular.isDefined(attrs.dfxGcDesign)) {
                return '/gcontrols/web/html_design.html';
            } else {
                return '/gcontrols/web/html.html';
            }
        },
        link: {
            pre : function(scope, element, attrs, basectrl) {
                var component = scope.getComponent(element);
                scope.component_id = component.id;
                scope.attributes = null;
                var current_element = element;

                basectrl.init(scope, element, component, attrs, 'html').then(function(){
                    scope.attributes.flex.status = "overridden" ;
                    if (!angular.isDefined(attrs.dfxGcEdit)) {
                        scope.gcSnippetTrustAsHtml = function(snippet) {
                            return $sce.trustAsHtml(snippet);
                        };
                    }
                    if (!angular.isDefined(attrs.dfxGcEdit) && scope.attributes.binding.value) {
                        scope.attributes.content.value = '';
                    }
                    if (!angular.isDefined(attrs.dfxGcDesign) && !angular.isDefined(attrs.dfxGcEdit)) {
                        $timeout(function(){
                            var component_id = component.id,
                                htmlId = component_id + '_html';
                            $(current_element).find("div").attr("id", htmlId);
                            $compile($(current_element).find("div").contents())(scope);
                        }, 0);
                    }
                    scope.changeWidth = function(){
                        $('#' + scope.component_id).css('width', scope.attributes.flex.value + '%');
                    };
                    if (!angular.isDefined(attrs.dfxGcEdit)) {
                        scope.changeWidth();
                    }
                });

                scope.showCodemirror = function(ev) {
                    $mdDialog.show({
                        scope: scope.$new(),
                        parent: angular.element(document.body),
                        targetEvent: ev,
                        clickOutsideToClose:true,
                        templateUrl: '/gcontrols/web/html_editor_template.html',
                        onComplete:function(scope){
                            var myTextArea = document.getElementById('dfx_html_editor');
                            var scriptEditor = CodeMirror(function (elt) {
                                    myTextArea.parentNode.replaceChild(elt, myTextArea);
                                },
                                {
                                    lineNumbers: true,
                                    value: (scope.attributes.content.value !== '') ? scope.attributes.content.value : $('#dfx_html_editor').text(),
                                    mode: {name: "xml", globalVars: true},
                                    matchBrackets: true,
                                    highlightSelectionMatches: {showToken: /\w/},
                                    styleActiveLine: true,
                                    viewportMargin : Infinity,
                                    extraKeys: {"Alt-F": "findPersistent", "Ctrl-Space": "autocomplete"},
                                    lineWrapping: true
                                });
                            scriptEditor.setSize(800, 400);
                            $(scriptEditor.getWrapperElement()).attr("id", "dfx_html_editor");
                        },
                        controller: function(scope){
                            scope.closeDialog = function() {
                                $mdDialog.hide();
                            }
                            scope.saveDialog = function() {
                                var editor = $('#dfx_html_editor.CodeMirror')[0].CodeMirror;
                                scope.attributes.content.value = editor.getValue();
                                scope.attributes.content.status = "overridden";
                                $mdDialog.hide();
                            }
                        }
                    })
                };
            }
        }
    }
});

dfxGControls.directive('dfxGcWebRichtext', function($timeout, $compile) {
    return {
        restrict: 'A',
        require: '^dfxGcWebBase',
        scope: true,
        templateUrl: function( el, attrs ) {
            if (angular.isDefined(attrs.dfxGcEdit)) {
                return '/gcontrols/web/rich_text_edit.html';
            } else if (angular.isDefined(attrs.dfxGcDesign)) {
                return '/gcontrols/web/rich_text_design.html';
            } else {
                return '/gcontrols/web/rich_text.html';
            }
        },
        link: function(scope, element, attrs, basectrl) {
            var component = scope.getComponent(element);
            scope.$gcscope = scope;
            basectrl.init(scope, element, component, attrs, 'rich_text').then(function() {
                scope.attributes.bindedData.status = "overridden";
                scope.attributes.toolbar.status = "overridden";
                scope.attributes.flex.status = "overridden";
                scope.changeWidth = function(){
                    $('#' + scope.component_id).css('width', scope.attributes.flex.value + '%');
                };
                if (!angular.isDefined(attrs.dfxGcEdit)) {
                    scope.changeWidth();
                }
                scope.rebuildQuillEditor = function(){
                    $("#" + component.id + ' ng-quill-editor').attr('toolbar-entries', scope.quillEditorEntries);
                    $timeout(function(){
                        $compile($("." + component.id + "_ng_quill_editor").contents())(scope);
                    }, 0);
                };
                scope.rebuildQuillEntries = function(){
                    scope.quillEditorEntries = '';
                    for ( var i = 0; i < scope.attributes.toolbar.entries.value.length; i++ ) {
                        if ( scope.attributes.toolbar.entries.value[i].value === true ) {
                            for ( var j = 0; j < scope.attributes.toolbar.entries.value[i].entries.length; j++ ) {
                                scope.quillEditorEntries = scope.quillEditorEntries + ' ' + scope.attributes.toolbar.entries.value[i].entries[j];
                            }
                        }
                    }
                    scope.rebuildQuillEditor();
                };
                $timeout(function(){
                    if ( $('#' + component.id + ' ng-quill-editor').attr('toolbar-entries') === 'init' ) {
                        scope.rebuildQuillEntries();
                    }
                }, 0);
                if (!angular.isDefined(attrs.dfxGcDesign) && !angular.isDefined(attrs.dfxGcEdit)) {
                    scope.$on("editorCreated", function (event, quillEditor) {
                        scope.$gcscope.$watch('$gcscope[attributes.binding.value]', function(newValue, oldValue) {
                            if ( newValue && angular.equals(newValue, oldValue) ) {
                                $timeout(function(){
                                    quillEditor.setHTML(newValue);
                                }, 0);
                            }
                        }, true);
                    });
                    basectrl.bindScopeVariable( scope, component.attributes.binding.value );
                }
            });
        }
    }
});

dfxGControls.directive('dfxGcWebCarousel', ['$http', '$sce', '$mdDialog', '$timeout', '$compile', '$parse', function($http, $sce, $mdDialog, $timeout, $compile, $parse) {
    return {
        restrict: 'A',
        require: '^dfxGcWebBase',
        scope: true,
        templateUrl: function( el, attrs ) {
            if (angular.isDefined(attrs.dfxGcEdit)) {
                return '/gcontrols/web/carousel_edit.html';
            } else if (angular.isDefined(attrs.dfxGcDesign)) {
                return '/gcontrols/web/carousel_design.html';
            } else {
                return '/gcontrols/web/carousel.html';
            }
        },
        link: function(scope, element, attrs, basectrl) {
            var component = scope.getComponent(element);
            scope.$gcscope = scope;
            basectrl.init(scope, element, component, attrs, 'carousel').then(function() {
                scope.attributes.static.status = "overridden";
                scope.attributes.flex.status = "overridden";
                scope.attributes.maxWidth.status = "overridden";
                scope.attributes.maxHeight.status = "overridden";
                scope.attributes.dynamicPresent = { "value": false };
                scope.attributes.layoutType = { "value": "none" };
                scope.showSlidesEditor = function(ev) {
                    $mdDialog.show({
                        scope: scope.$new(),
                        parent: angular.element(document.body),
                        targetEvent: ev,
                        clickOutsideToClose:true,
                        ariaLabel: 'slides-editor',
                        templateUrl: '/gcontrols/web/carousel_slides_editor.html',
                        onComplete: function() {
                            $('.menu-structure li').eq(scope.selectedIndex).addClass('active');
                        },
                        controller: function() {
                            scope.counterSlide = scope.attributes.static.value.length;
                            scope.selectedIndex = 0;
                            scope.currentSlide = scope.attributes.static.value[scope.selectedIndex];
                            scope.closeDialog = function() {
                                $mdDialog.hide();
                            }
                        }
                    });
                }

                scope.activeSlide = function() {
                    $('.menu-structure li').removeClass('active');
                    $('.menu-structure li').eq( scope.selectedIndex ).addClass('active');
                }

                scope.selectSlideItem = function( index ) {
                    scope.attributes.static.status = "overridden";
                    scope.selectedIndex = index;
                    scope.currentSlide = scope.attributes.static.value[scope.selectedIndex];
                    scope.activeSlide();
                }

                scope.addSlideItem = function(){
                    var temp = {
                        "name": "slide1",
                        "title": "<h2>Sample Title</h2>",
                        "description": "<h4>Sample description</h4>",
                        "src": "'/images/dfx_image_blank.png'"
                    }
                    scope.attributes.static.status = "overridden" ;
                    scope.counterSlide++;
                    temp.name = "slide" + scope.counterSlide;
                    scope.attributes.static.value.length === 0 ? scope.selectedIndex = 0 : scope.selectedIndex++;
                    scope.attributes.static.value.splice(scope.selectedIndex, 0, temp);
                    scope.currentSlide = scope.attributes.static.value[scope.selectedIndex];
                    $timeout(function() { scope.activeSlide(); }, 0);
                };

                scope.moveSlideUp = function() {
                    if ( scope.selectedIndex > 0 ) {
                        var movedSlide = scope.currentSlide,
                            fromIndex = scope.selectedIndex,
                            toIndex = scope.selectedIndex - 1;
                        scope.attributes.static.value.splice(fromIndex, 1);
                        scope.attributes.static.value.splice(toIndex, 0, movedSlide);
                        --scope.selectedIndex;
                        scope.currentSlide = scope.attributes.static.value[scope.selectedIndex];
                        scope.activeSlide();
                    }
                }

                scope.moveSlideDown = function() {
                    if ( scope.selectedIndex < ( scope.attributes.static.value.length - 1 )) {
                        var movedSlide = scope.currentSlide,
                            fromIndex = scope.selectedIndex,
                            toIndex = scope.selectedIndex + 1;
                        scope.attributes.static.value.splice(fromIndex, 1);
                        scope.attributes.static.value.splice(toIndex, 0, movedSlide);
                        ++scope.selectedIndex;
                        scope.currentSlide = scope.attributes.static.value[scope.selectedIndex];
                        scope.activeSlide();
                    }
                }

                scope.removeSlideItem = function(){
                    scope.attributes.static.status = "overridden";
                    if(scope.attributes.static.value.length === 1){
                        scope.selectedIndex = 0;
                        scope.currentSlide = scope.attributes.static.value[0];
                        scope.attributes.static.value.splice(0, 1);
                        scope.currentSlide = {};
                    }else{
                        var temp = scope.selectedIndex;
                        scope.attributes.static.value.splice(temp, 1);
                        if(temp === 0){
                            scope.selectedIndex = 0;
                            scope.currentSlide = scope.attributes.static.value[0];
                        }else{
                            scope.selectedIndex = temp - 1;
                            scope.currentItem = scope.attributes.static.value[scope.selectedIndex];
                        }
                    }
                    scope.activeSlide();
                };

                scope.setCarouselDataSource = function() {
                    scope.carouselDataName = { "value": "" };
                    if (!angular.isDefined(attrs.dfxGcDesign) && !angular.isDefined(attrs.dfxGcEdit)) {
                        scope.carouselDataName.value = scope.attributes.dynamic.value !== '' ? scope.attributes.dynamic.value : 'attributes.static.value';
                    } else {
                        scope.carouselDataName.value = 'attributes.static.value';
                    }
                }

                scope.compileSlides = function(){
                    if (!angular.isDefined(attrs.dfxGcDesign) && !angular.isDefined(attrs.dfxGcEdit)) {
                        $timeout(function(){
                            var screenSlides = $("#" + component.id + "_dfx_gc_web_carousel .dfx-carousel-item");
                            if ( scope.attributes.dynamic.value !== '' ) {
                                for ( var i = 0; i < scope.$gcscope[scope.attributes.dynamic.value].length; i++ ) {
                                    $(screenSlides).eq(i+1).find('img').attr('ng-click', '$eval('+scope.attributes.dynamic.value+'['+[i]+'].onclick)');
                                }
                            } else {
                                for ( var i = 0; i < scope.attributes.static.value.length; i++ ) {
                                    $(screenSlides).eq(i+1).find('img').attr('ng-click', '$eval(attributes.static.value['+[i]+'].onclick)');
                                }
                            }
                            $compile($("#" + component.id + "_dfx_gc_web_carousel .dfx-carousel-item-image-container").contents())(scope);
                            $compile($("#" + component.id + "_dfx_gc_web_carousel .dfx-carousel-item-title").contents())(scope);
                            $compile($("#" + component.id + "_dfx_gc_web_carousel .dfx-carousel-item-description").contents())(scope);
                        }, 0);
                    }
                }

                scope.simpleCarousel = function() {
                    scope.setCarouselDataSource();
                    var simpleCarouselSnippet = '<jk-carousel data="<<carouselSource>>" item-template-url="\'<<carouselTemplate>>\'" max-width="<<carouselMaxWidth>>" max-height="<<carouselMaxHeight>>"></jk-carousel>',
                        parsedSimpleCarousel = simpleCarouselSnippet
                            .replace('<<carouselSource>>', scope.carouselDataName.value)
                            .replace('<<carouselTemplate>>', scope.attributes.dynamic.value !== '' && (!angular.isDefined(attrs.dfxGcDesign) && !angular.isDefined(attrs.dfxGcEdit)) ? '/gcontrols/web/carousel_item_dynamic.html' : '/gcontrols/web/carousel_item_static.html')
                            .replace('<<carouselMaxWidth>>', scope.attributes.maxWidth.value)
                            .replace('<<carouselMaxHeight>>', scope.attributes.maxHeight.value);
                    $timeout(function(){
                        $("#" + component.id + "_dfx_gc_web_carousel").empty().html(parsedSimpleCarousel);
                        $timeout(function(){
                            $compile($("#" + component.id + "_dfx_gc_web_carousel").contents())(scope);
                            scope.compileSlides();
                        }, 0);
                    }, 0);
                }

                scope.autoCarousel = function() {
                    scope.setCarouselDataSource();
                    var autoCarouselSnippet = '<jk-carousel data="<<carouselSource>>" item-template-url="\'<<carouselTemplate>>\'" auto-slide="<<carouselAutoSlide>>" auto-slide-time="<<carouselSlideInterval>>" max-width="<<carouselMaxWidth>>" max-height="<<carouselMaxHeight>>"></jk-carousel>',
                        parsedAutoCarousel = autoCarouselSnippet
                            .replace('<<carouselSource>>', scope.carouselDataName.value)
                            .replace('<<carouselTemplate>>', scope.attributes.dynamic.value !== '' ? '/gcontrols/web/carousel_item_dynamic.html' : '/gcontrols/web/carousel_item_static.html')
                            .replace('<<carouselAutoSlide>>', scope.attributes.autoSlide.value)
                            .replace('<<carouselSlideInterval>>', scope.attributes.slideInterval.value)
                            .replace('<<carouselMaxWidth>>', scope.attributes.maxWidth.value)
                            .replace('<<carouselMaxHeight>>', scope.attributes.maxHeight.value);
                    $timeout(function(){
                        $("#" + component.id + "_dfx_gc_web_carousel").empty().html(parsedAutoCarousel);
                        $timeout(function(){
                            $compile($("#" + component.id + "_dfx_gc_web_carousel").contents())(scope);
                            scope.compileSlides();
                        }, 0);
                    }, 0);
                }

                scope.parseSlideSrc = function() {
                    for ( var i = 0; i < scope.attributes.static.value.length; i++ ) {
                        var testSrc = scope.attributes.static.value[i].src;
                        if (!angular.isDefined(attrs.dfxGcDesign) && !angular.isDefined(attrs.dfxGcEdit)) {
                            if (testSrc.indexOf("'") == -1) {
                                scope.attributes.static.value[i].parsedSrc = scope.$gcscope[scope.attributes.static.value[i].src];
                            } else if (testSrc.indexOf("'") == 0 && testSrc.lastIndexOf("'") == (testSrc.length - 1) && testSrc.length > 2) {
                                var srcWithoutQuotes = testSrc.replace(/'/g, '');
                                scope.attributes.static.value[i].parsedSrc = srcWithoutQuotes;
                            } else {
                                scope.attributes.static.value[i].parsedSrc = scope.attributes.static.value[i].src;
                            }
                        } else {
                            if (testSrc.indexOf("'") == -1) {
                                scope.attributes.static.value[i].parsedSrc = '/images/dfx_image_blank.png';
                            } else if (testSrc.indexOf("'") == 0 && testSrc.lastIndexOf("'") == (testSrc.length - 1) && testSrc.length > 2) {
                                var srcWithoutQuotes = testSrc.replace(/'/g, '');
                                scope.attributes.static.value[i].parsedSrc = srcWithoutQuotes;
                            } else {
                                scope.attributes.static.value[i].parsedSrc = scope.attributes.static.value[i].src;
                            }
                        }
                    }
                }

                scope.rebuildCarousel = function() {
                    if ( scope.attributes.dynamic.value === '' && scope.attributes.static.value.length > 0 ) {
                        scope.parseSlideSrc();
                    }
                    $timeout(function(){
                        scope.attributes.autoSlide.value === 'true' ? scope.autoCarousel() : scope.simpleCarousel();
                    }, 0);
                }

                scope.showHtmlEditor = function(ev, htmlValue, htmlType) {
                    scope.htmlType = htmlType;
                    $('#' + scope.component_id + '_md_dialog .second-dialog-box').load('/gcontrols/web/carousel_html_editor.html');
                    $timeout(function() {
                        $compile($('.second-dialog-box').contents())(scope);
                        var myTextArea = document.getElementById('dfx_html_editor');
                        scope.htmlEditor = CodeMirror(function (elt) {
                                myTextArea.parentNode.replaceChild(elt, myTextArea);
                            },
                            {
                                lineNumbers: true,
                                value: htmlValue,
                                mode: {name: "xml", globalVars: true},
                                matchBrackets: true,
                                highlightSelectionMatches: {showToken: /\w/},
                                styleActiveLine: true,
                                viewportMargin : Infinity,
                                extraKeys: {"Alt-F": "findPersistent", "Ctrl-Space": "autocomplete"},
                                lineWrapping: true
                            });
                        scope.htmlEditor.setSize(856, 380);
                        $timeout(function(){
                            scope.htmlEditor.refresh();
                            scope.htmlEditor.focus();
                        },0);
                        $(scope.htmlEditor.getWrapperElement()).attr("id", "dfx_html_editor");
                        $('#' + scope.component_id + '_md_dialog .second-dialog').fadeIn(250);
                    });
                }

                scope.setHtmlValue = function() {
                    switch ( scope.htmlType ) {
                        case 'title': scope.currentSlide.title = scope.htmlEditor.getValue(); break;
                        case 'description': scope.currentSlide.description = scope.htmlEditor.getValue(); break;
                    }
                    scope.hideHtmlEditor();
                }

                scope.hideHtmlEditor = function() {
                    $(".second-dialog").fadeOut('250', function() { $(this).remove(); });
                }

                scope.setImage = function( imageSrc ) {
                    scope.currentSlide.src = "'" + imageSrc + "'";
                    scope.rebuildCarousel();
                    scope.hideDiakogImages();
                }

                scope.hideDiakogImages = function() {
                    scope.hideHtmlEditor();
                }

                if (!angular.isDefined(attrs.dfxGcDesign) && !angular.isDefined(attrs.dfxGcEdit)) {
                    if ( scope.attributes.dynamic.value !== '' ) {
                        scope.$watch('$gcscope[attributes.dynamic.value]', function(newValue, oldValue) {
                            if ( newValue ) {
                                scope.rebuildCarousel();
                            }
                        }, true);
                        basectrl.bindScopeVariable(scope, component.attributes.dynamic.value);
                    } else {
                        scope.$watch('attributes.static.value', function(newValue, oldValue) {
                            if ( newValue ) {
                                $timeout(function(){
                                    scope.rebuildCarousel();
                                }, 0, false);
                            }
                        }, true);
                    }
                } else {
                    scope.rebuildCarousel();
                }
            });
        }
    }
}]);

dfxGControls.directive('dfxGcWebJson', ['$http', '$sce', '$mdDialog', '$timeout', '$compile', '$parse', 'dfxMessaging', function($http, $sce, $mdDialog, $timeout, $compile, $parse, dfxMessaging) {
    return {
        restrict: 'A',
        require: '^dfxGcWebBase',
        scope: true,
        templateUrl: function( el, attrs ) {
            if (angular.isDefined(attrs.dfxGcEdit)) {
                return '/gcontrols/web/gc_json_edit.html';
            } else if (angular.isDefined(attrs.dfxGcDesign)) {
                return '/gcontrols/web/gc_json_design.html';
            } else {
                return '/gcontrols/web/gc_json.html';
            }
        },
        link: function(scope, element, attrs, basectrl) {
            var component = scope.getComponent(element);
            scope.$gcscope = scope;
            basectrl.init(scope, element, component, attrs, 'gc_json').then(function() {
                scope.attributes.flex.status = 'overridden';
                scope.attributes.type.status = 'overridden';
                scope.attributes.mode.status = 'overridden';
                if(scope.attributes.binding.value!==''){scope.attributes.binding.status = 'overridden';}
                if(scope.attributes.binding.value!==''){scope.attributes.binding.status = 'overridden';}
                if(!scope.attributes.hasOwnProperty('headerVisible')){scope.attributes.headerVisible = {"value":true};}
                scope.stringModel = {"value":""};
                scope.viewDialog = { "mode": false };
                scope.dfxJeSetMode = function( mode ){
                    scope.dfxJsonEditor.setMode(mode);
                }
                scope.dfxJeOnChange = function(){
                    var dfxJeChanged = scope.dfxJsonEditor.get();
                    if (!angular.isDefined(attrs.dfxGcDesign) && !angular.isDefined(attrs.dfxGcEdit)) {
                        if(scope.attributes.binding.value!==''){
                            if(!angular.equals(scope.$gcscope[scope.attributes.binding.value], dfxJeChanged)){
                                scope.$gcscope[scope.attributes.binding.value] = dfxJeChanged;
                                scope.stringModel.value = angular.toJson(dfxJeChanged);
                                eval(scope.attributes.onchange.value);
                                // console.log('*******onChange******', scope.dfxJsonEditor.get());
                                // dfxMessaging.showMessage(scope.dfxJsonEditor.get());
                            }
                        }else{
                            if(!angular.equals(scope.attributes.content.value, dfxJeChanged)){
                                scope.attributes.content.value = dfxJeChanged;
                                scope.stringModel.value = angular.toJson(dfxJeChanged);
                                eval(scope.attributes.onchange.value);
                                // console.log('*******onChange******', scope.dfxJsonEditor.get());
                                // dfxMessaging.showMessage(scope.dfxJsonEditor.get());
                            }
                        }
                    } else {
                        if(!angular.equals(scope.attributes.content.value, dfxJeChanged)){
                            scope.attributes.content.value = dfxJeChanged;
                            scope.stringModel.value = angular.toJson(dfxJeChanged);
                            eval(scope.attributes.onchange.value);
                            // console.log('*******onChange******', scope.dfxJsonEditor.get());
                            // dfxMessaging.showMessage(scope.dfxJsonEditor.get());
                        }
                    }
                }
                scope.dfxJeOnModeChange = function( newMode, oldMode ){
                    eval(scope.attributes.onmodechange.value);
                    if (!scope.isDisabled){
                        scope.lastMode = newMode;
                    }
                    // console.log('*******onModeChange******', 'Mode switched from '+oldMode+' to '+newMode);
                    // dfxMessaging.showMessage('Mode switched from '+oldMode+' to '+newMode);
                }
                scope.dfxJeOnError = function( err ){
                    eval(scope.attributes.onerror.value);
                    // console.log('*******onError******', ''+err);
                    // dfxMessaging.showError(''+err);
                }
                scope.checkHeaderVisibility = function () {
                    var panelToolbar = $('#'+component.id+' md-toolbar.dfx-je-toolbar'),
                        panelBody = $('#'+component.id+' div.jsoneditor-outer');
                    if(!scope.attributes.headerVisible.value){
                        panelToolbar.hide();
                        panelBody.css({'margin':0,"padding":0});
                    }else{
                        panelToolbar.show();
                        panelBody.css({'margin':"-48px 0 0","padding":"48px 0 0"});
                    }
                }
                scope.runJsonEditor = function( container, mode, model ){
                    scope.dfxJsonEditor = null;
                    var options = {
                        mode:           mode,
                        modes:          ['tree','form','code','text','view'],
                        history:        true,
                        onChange:       function(){scope.dfxJeOnChange();},
                        onModeChange:   function(newMode, oldMode){scope.dfxJeOnModeChange(newMode,oldMode);},
                        onError:        function(err){scope.dfxJeOnError(err);}
                    }
                    $timeout(function() {
                        scope.dfxJsonEditor = new JSONEditor(container, options, model);
                        scope.checkHeaderVisibility();
                        scope.lastMode = mode;
                    }, 0);
                }
                scope.inputToJson = function(){
                    try {
                        if(JSON.parse(scope.stringModel.value)){
                            var inputJson = angular.fromJson(scope.stringModel.value);
                            if (!angular.isDefined(attrs.dfxGcDesign) && !angular.isDefined(attrs.dfxGcEdit)) {
                                if(scope.attributes.binding.value!==''){
                                    if(!angular.equals(scope.$gcscope[scope.attributes.binding.value], inputJson)) {
                                        scope.$gcscope[scope.attributes.binding.value] = inputJson;
                                    }
                                }else{
                                    if(!angular.equals(scope.attributes.content.value, inputJson)) {
                                        scope.attributes.content.value = inputJson;
                                    }
                                }
                                angular.element($('#'+component.id+'_scopeInput')).data('$ngModelController').$setValidity('editorInput', true);
                            } else {
                                if(!angular.equals(scope.attributes.content.value, inputJson)) {
                                    scope.attributes.content.value = inputJson;
                                }
                            }
                        }
                    }
                    catch(err) {
                        if (!angular.isDefined(attrs.dfxGcDesign) && !angular.isDefined(attrs.dfxGcEdit)) {
                            angular.element($('#'+component.id+'_scopeInput')).data('$ngModelController').$setValidity('editorInput', false);
                        }
                    }
                }
                scope.showJsonDialog = function(ev) {
                    $mdDialog.show({
                        scope: scope.$new(),
                        parent: angular.element(document.body),
                        targetEvent: ev,
                        clickOutsideToClose: true,
                        ariaLabel: 'dialog-json-editor',
                        templateUrl: '/gcontrols/web/gc_json_dialog.html',
                        onComplete: function() {
                            var container = document.getElementById(component.id+'_dfx_json_editor_dialog_panel');
                            if(container){
                                $(container).empty();
                                if (!angular.isDefined(attrs.dfxGcDesign) && !angular.isDefined(attrs.dfxGcEdit)) {
                                    if (scope.attributes.binding.value!==''){
                                        scope.runJsonEditor(container, scope.attributes.mode.value, scope.$gcscope[scope.attributes.binding.value]);
                                    } else {
                                        scope.runJsonEditor(container, scope.attributes.mode.value, scope.attributes.content.value);
                                    }
                                } else {
                                    scope.runJsonEditor(container, scope.attributes.mode.value, scope.attributes.content.value);
                                }
                                $(".dfx-dialog-json-editor .dfx-web-gc-json-dialog-tab").fadeIn();
                            }
                        },
                        controller: function() {
                            scope.closeJsonDialog = function() {
                                $mdDialog.hide();
                            }
                        }
                    });
                }
                scope.buildJsonEditor = function(){
                    if(scope.attributes.type.value==='panel'){
                        $timeout(function() {
                            var container = document.getElementById(component.id+'_dfx_gc_web_json_panel');
                            if(container){
                                scope.runJsonEditor(container, scope.attributes.mode.value, scope.attributes.content.value);
                            }
                        }, 0);
                    }
                }

                if (scope.attributes.type.value==='panel') {
                    $timeout(function() {
                        var container = document.getElementById(component.id+'_dfx_gc_web_json_panel');
                        if (container){
                            $(container).empty();
                            if (!angular.isDefined(attrs.dfxGcDesign) && !angular.isDefined(attrs.dfxGcEdit)) {
                                if (scope.attributes.binding.value!==''){
                                    scope.runJsonEditor(container, scope.attributes.mode.value, scope.$gcscope[scope.attributes.binding.value]);
                                } else {
                                    scope.runJsonEditor(container, scope.attributes.mode.value, scope.attributes.content.value);
                                }
                            } else {
                                scope.runJsonEditor(container, scope.attributes.mode.value, scope.attributes.content.value);
                            }
                            $timeout(function() {
                                if(eval('scope.'+scope.attributes.disabled.value)){
                                    scope.dfxJsonEditor.setMode('view');
                                    $timeout(function() {
                                        var initModeBtn = $("#" + component.id + "_dfx_gc_web_json_panel button.jsoneditor-modes");
                                        $(initModeBtn).attr('disabled', true);
                                    }, 0);
                                }else{
                                }
                                // $compile($('#'+component.id+'_dfx_gc_web_json_panel md-toolbar'))(scope);
                            }, 0);
                        }
                        scope.$watch(scope.attributes.disabled.value, function(newValue){
                            if(scope.dfxJsonEditor){
                                if(eval(newValue)){
                                    scope.isDisabled = true;
                                    scope.dfxJsonEditor.setMode('view');
                                    var modeBtn = $("#" + component.id + "_dfx_gc_web_json_panel button.jsoneditor-modes");
                                    $(modeBtn).attr('disabled',true);
                                } else {
                                    scope.isDisabled = false;
                                    scope.dfxJsonEditor.setMode(scope.lastMode);
                                    var modeBtn = $("#" + component.id + "_dfx_gc_web_json_panel button.jsoneditor-modes");
                                    $(modeBtn).attr('disabled',false);
                                }
                            }
                        }, true);
                    }, 0);
                } else {
                    if (!angular.isDefined(attrs.dfxGcDesign) && !angular.isDefined(attrs.dfxGcEdit)) {
                        if(scope.attributes.binding.value!==''){
                            scope.stringModel.value = angular.toJson(scope.$gcscope[scope.attributes.binding.value]);
                        }else{
                            scope.stringModel.value = angular.toJson(scope.attributes.content.value);
                        }
                    } else {
                        scope.stringModel.value = angular.toJson(scope.attributes.content.value);
                    }
                }
                if (!angular.isDefined(attrs.dfxGcDesign) && !angular.isDefined(attrs.dfxGcEdit)) {
                    if(scope.attributes.binding.value!==''){
                        basectrl.bindScopeVariable(scope, component.attributes.binding.value);
                        scope.$watch('$gcscope[attributes.binding.value]', function(newValue){
                            if (newValue) {
                                if (scope.dfxJsonEditor) {
                                    var editorData = scope.dfxJsonEditor.get();
                                    if(!angular.equals(newValue, editorData)) {
                                        scope.dfxJsonEditor.set(newValue);
                                    }
                                }
                                scope.stringModel.value = angular.toJson(newValue);
                            }
                        }, true);
                    }
                }
            });
        }
    }
}]);

dfxGControls.directive('dfxGcWebRating', function() {
    return {
        restrict: 'A',
        require: '^dfxGcWebBase',
        scope: true,
        templateUrl: function( el, attrs ) {
            if (angular.isDefined(attrs.dfxGcEdit)) {
                return '/gcontrols/web/rating_edit.html';
            } else if (angular.isDefined(attrs.dfxGcDesign)) {
                return '/gcontrols/web/rating_design.html';
            } else {
                return '/gcontrols/web/rating.html';
            }
        },
        link: {
            pre : function(scope, element, attrs, basectrl) {
                var component = scope.getComponent(element);
                scope.component_id = component.id;
                scope.attributes = null;
                basectrl.init(scope, element, component, attrs, 'rating').then(function(){
                    scope.attributes.binding.status = "overridden";
                    scope.attributes.maxValue.status = "overridden";
                    scope.attributes.icon.status = "overridden";
                    if ( !scope.attributes.icon.hasOwnProperty('type') ) { scope.attributes.icon.type = 'fa-icon'; }
                    if ( !scope.attributes.icon.hasOwnProperty('size') ) { scope.attributes.icon.size = 21; }
                    if ( scope.attributes.range.hasOwnProperty('values') ) {delete scope.attributes.range.values; }
                    scope.ifShowIconTypes = function( icon ) {
                        var regexp = /(^\')(.*)(\'$)/gm, filtered = regexp.exec( icon );
                        if ( icon && ( icon.indexOf('+') >= 0 ) ) { filtered = false; }
                        if ( icon === '' ) { filtered = true; }
                        if ( icon.indexOf("'") === 0 && icon.indexOf('+') === -1 && icon.charAt(icon.length-1) === "'" ) {
                            icon.indexOf("'fa-") === 0 ? scope.attributes.icon.type = 'fa-icon' : scope.attributes.icon.type = 'svg-icon';
                        }
                        scope.showIconTypes = filtered ? false : true;
                    }
                    scope.ifShowIconTypes(scope.attributes.icon.value);
                    if (!angular.isDefined(attrs.dfxGcDesign) && !angular.isDefined(attrs.dfxGcEdit)) {
                        scope.$gcscope = scope;
                        basectrl.bindScopeVariable(scope, component.attributes.binding.value);
                    }
                    function updateStars() {
                        scope.stars = [];
                        for (var i = 0; i < scope.attributes.range.value; i++) {
                            var rangeStep = scope.attributes.maxValue.value/scope.attributes.range.value;
                            if ( !angular.isDefined(attrs.dfxGcDesign) && !angular.isDefined(attrs.dfxGcEdit) ) {
                                scope.stars.push({
                                    filled: i*rangeStep < scope.$gcscope[scope.attributes.binding.value]
                                });
                            } else {
                                if ( !scope.attributes.binding.value ) {
                                    scope.stars.push({
                                        filled: i*rangeStep < scope.attributes.binding.value
                                    });
                                } else if ( scope.attributes.binding.value && (parseFloat( scope.attributes.binding.value ) >= 0) ) {
                                    scope.stars.push({
                                        filled: i*rangeStep < scope.attributes.binding.value
                                    });
                                } else {
                                    scope.stars.push({
                                        filled: i*rangeStep < ( scope.attributes.maxValue.value )/2
                                    });
                                }
                            }
                        }
                    };
                    scope.toggle = function(index) {
                        var rangeStep = scope.attributes.maxValue.value/scope.attributes.range.value;
                        if (!angular.isDefined(attrs.dfxGcDesign) && !angular.isDefined(attrs.dfxGcEdit)) {
                            scope.attributes.disabled.value === "false" ? scope.$gcscope[scope.attributes.binding.value] = index*rangeStep + rangeStep : index*rangeStep;
                            updateStars();
                        } else {
                            if ( scope.attributes.binding.value.length === 0 ) {
                                scope.attributes.disabled.value === "false" ? scope.attributes.binding.value = index*rangeStep + rangeStep : index*rangeStep;
                            } else if ( scope.attributes.binding.value > 0 && (parseFloat( scope.attributes.binding.value ) >= 0) ) {
                                scope.attributes.disabled.value === "false" ? scope.attributes.binding.value = index*rangeStep + rangeStep : index*rangeStep;
                            }
                        }
                    };
                    scope.$watch('attributes.binding.value', function(newValue) {
                        if (newValue) {
                            updateStars();
                        }
                    });
                    scope.$watch('attributes.range.value', function(newValue) {
                        if (newValue) {
                            updateStars();
                        }
                    });
                    scope.$watch('attributes.maxValue.value', function(newValue) {
                        if (newValue) {
                            updateStars();
                        }
                    });
                    scope.$watch('attributes.disabled.value', function(newValue) {
                        if (newValue) {
                            updateStars();
                        }
                    });
                    if (!angular.isDefined(attrs.dfxGcDesign) && !angular.isDefined(attrs.dfxGcEdit)) {
                        scope.$watch("$gcscope[attributes.binding.value]", function(newValue){
                            updateStars();
                        });
                    }
                });
            }
        }
    }
});

dfxGControls.directive('dfxGcWebTreeview', [ '$timeout', '$compile', '$http', '$mdDialog', '$filter',  function($timeout, $compile, $http, $mdDialog, $filter) {
    return {
        restrict: 'A',
        require: '^dfxGcWebBase',
        scope: true,
        templateUrl: function( el, attrs ) {
            if (angular.isDefined(attrs.dfxGcEdit)) {
                return '/gcontrols/web/treeview_edit.html';
            } else if (angular.isDefined(attrs.dfxGcDesign)) {
                return '/gcontrols/web/treeview_design.html';
            } else {
                return '/gcontrols/web/treeview.html';
            }
        },
        link: function(scope, element, attrs, basectrl) {
            var component = scope.getComponent(element);
            scope.$gcscope = scope;
            basectrl.init(scope, element, component, attrs, 'treeview').then(function() {
                if ( !scope.attributes.hasOwnProperty('flex') ) { scope.attributes.flex = { "value": 100 }; }
                scope.attributes.flex.status = "overridden";
                scope.attributes.dynamic.status = "overridden";
                scope.attributes.static.status = "overridden";
                scope.attributes.isOpened.status = "overridden";
                scope.attributes.isClosed.status = "overridden";
                if ( !scope.attributes.hasOwnProperty('iconType') ) {
                    scope.attributes.iconType = { "value": 'fa-icon' };
                    scope.attributes.isOpened.type = scope.attributes.iconType.value;
                    scope.attributes.isClosed.type = scope.attributes.iconType.value;
                    scope.attributes.iconType.status = "overridden";
                } else {
                    scope.attributes.iconType.status = "overridden";
                }
                scope.ifShowIconTypes = function( icon, status ) {
                    var regexp = /(^\')(.*)(\'$)/gm, filtered = regexp.exec( icon );
                    if ( icon && ( icon.indexOf('+') >= 0 ) ) { filtered = false; }
                    if ( icon === '' ) { filtered = true; }
                    if ( icon.indexOf("'") === 0 && icon.indexOf('+') === -1 && icon.charAt(icon.length-1) === "'" ) {
                        if ( icon.indexOf("'fa-") === 0 ) {
                            switch ( status ) {
                                case 'isOpened': scope.attributes.isOpened.type = 'fa-icon'; break;
                                case 'isClosed': scope.attributes.isClosed.type = 'fa-icon'; break;
                            }
                        } else {
                            switch ( status ) {
                                case 'isOpened': scope.attributes.isOpened.type = 'svg-icon'; break;
                                case 'isClosed': scope.attributes.isClosed.type = 'svg-icon'; break;
                            }
                        }
                    }
                    if ( status === 'isOpened' ) {
                        scope.showOpenedIconTypes = filtered ? false : true;
                    } else {
                        scope.showClosedIconTypes = filtered ? false : true;
                    }

                }
                scope.ifShowIconTypes(scope.attributes.isOpened.value, 'isOpened');
                scope.ifShowIconTypes(scope.attributes.isClosed.value, 'isClosed');
                scope.toggleNode = function( event, node ) {
                    node.expanded ? node.expanded = false : node.expanded = true;
                }
                if (!angular.isDefined(attrs.dfxGcDesign) && !angular.isDefined(attrs.dfxGcEdit)) {
                    basectrl.bindScopeVariable( scope, component.attributes.dynamic );
                }
            });
        }
    }
}]);

var DfxGcChartUtil = (function () {
    var api = {};

    var removeBracketsFromEventListener = function(eventListener) {
        return (eventListener) ? eventListener.replace(/\(.*?\)/g, "") : eventListener;
    };
    var refreshChartToReflectFlexSize = function(scope, isDesignTime, $timeout, oldFlexValue) {
          $timeout(function() {
              if (isDesignTime) {
                  if (scope.dfxDesignChartApi && scope.dfxDesignChartApi.refresh) {
                      //remove old flex class and add new manually because it's not done automatically after chart dropping
                      if (oldFlexValue) { $('#' + scope.component_id).removeClass('flex' + '-' + oldFlexValue); }
                      $('#' + scope.component_id).attr('flex', scope.attributes.flex.value);
                      $('#' + scope.component_id).addClass('flex' + '-' + scope.attributes.flex.value);

                      scope.dfxDesignChartApi.refresh();
                  }
              } else {
                  if (scope[scope.attributes.name.value].refresh) {
                      scope[scope.attributes.name.value].refresh();
                  }
              }
          }, 0);
    };

    api.adjustContainerHeight = function(scope) {
        // adjust container height to include title height
        var containerHeight = $('#' + scope.component_id).find('.dfx-core-gc-chart').height();
        var chartTitleHeight = $('#' + scope.component_id).find('.title').height() * 1.5 || 30;
        $('#' + scope.component_id).height(containerHeight + chartTitleHeight);
    };

    api.setAttributesBeforeInit = function (scope, attrs, chartOptions, chartData, chartTempName) {
        if (angular.isDefined(attrs.dfxGcEdit) || angular.isDefined(attrs.dfxGcDesign)) { // DESIGN TIME
            scope.dfxDesignChartOptions = chartOptions;     //must set main chart attributes before reading json definition from file,
            scope.dfxDesignChartData = chartData;           //otherwise when drag&drop chart, it'll not be shown before save/refresh
        } else {
            //must set main chart options before reading json definition from file,
            //otherwise, chart is not constructed - and when attributes are reset from file - chart does not exist and nvd3.watch is useless
            scope.attributes.options = {value: chartOptions};

            scope.$gcscope = scope;                         //also, must set it here, before reading data from file
            scope.attributes.name = {value: chartTempName}; //must create temp chart name to let nvd3 assign to it its API
        }
    };

    api.setDesignTimeAttributes = function (scope, $timeout, $filter) {
        scope.dfxDesignChartOptions.title = {
            text: $filter('checkExpression')(scope.attributes.title.value),
            enable: true
        };
        if (scope.attributes.options.xAxisLabel) {
            scope.dfxDesignChartOptions.chart.xAxis.axisLabel = $filter('checkExpression')(scope.attributes.options.xAxisLabel);
            scope.dfxDesignChartOptions.chart.yAxis.axisLabel = $filter('checkExpression')(scope.attributes.options.yAxisLabel);
        }
        if (scope.attributes.options.xAxisLabelDistance) {
            scope.dfxDesignChartOptions.chart.xAxis.axisLabelDistance = parseInt(scope.attributes.options.xAxisLabelDistance) || -5;
            scope.dfxDesignChartOptions.chart.yAxis.axisLabelDistance = parseInt(scope.attributes.options.yAxisLabelDistance) || -5;
        }
        if (scope.attributes.options.duration) {
            scope.dfxDesignChartOptions.chart.duration = parseInt(scope.attributes.options.duration) || 500;
        }
        if (scope.attributes.options.showValues) {
            scope.dfxDesignChartOptions.chart.showValues = scope.attributes.options.showValues;
        }
        if (scope.attributes.options.showXAxis) {
            scope.dfxDesignChartOptions.chart.showXAxis = scope.attributes.options.showXAxis;
            scope.dfxDesignChartOptions.chart.showYAxis = scope.attributes.options.showYAxis;
        }
        if (scope.attributes.options.showControls) {
            scope.dfxDesignChartOptions.chart.showControls = scope.attributes.options.showControls;
        }
        if (scope.attributes.options.showLegend) {
            scope.dfxDesignChartOptions.chart.showLegend = scope.attributes.options.showLegend == 'false' ? false : true;
        }
        if (scope.attributes.options.stacked) {
            scope.dfxDesignChartOptions.chart.stacked = scope.attributes.options.stacked == 'true' ? true : false;
        }
        if (scope.attributes.options.useInteractiveGuideline) {
            scope.dfxDesignChartOptions.chart.useInteractiveGuideline = scope.attributes.options.useInteractiveGuideline;
        }
        if (scope.attributes.options.rescaleY) {
            scope.dfxDesignChartOptions.chart.rescaleY = scope.attributes.options.rescaleY;
        }
        if (scope.attributes.options.labelSunbeamLayout) {
            scope.dfxDesignChartOptions.chart.labelSunbeamLayout = scope.attributes.options.labelSunbeamLayout == 'false' ? false : true;
        }
        if (scope.attributes.options.labelThreshold) {
            scope.dfxDesignChartOptions.chart.labelThreshold = scope.attributes.options.labelThreshold;
        }
        if (scope.attributes.options.donutLabelsOutside) {
            scope.dfxDesignChartOptions.chart.donutLabelsOutside = scope.attributes.options.donutLabelsOutside == 'true' ? true : false;
        }
        if (scope.attributes.options.showLabels) {
            scope.dfxDesignChartOptions.chart.showLabels = scope.attributes.options.showLabels == 'false' ? false : true;
        }
        if (scope.attributes.options.cornerRadius) {
            scope.dfxDesignChartOptions.chart.cornerRadius = scope.attributes.options.cornerRadius;
        }
        if (scope.attributes.options.growOnHover) {
            scope.dfxDesignChartOptions.chart.growOnHover = scope.attributes.options.growOnHover;
        }

        refreshChartToReflectFlexSize(scope, true, $timeout);
    };

    api.setRunTimeAttributes = function (scope, chartTypeDef, chartEventNames, $timeout) {
        if (scope.attributes.title.value) {
            scope.attributes.options.value.title = {
                text: scope.attributes.title.value,
                enable: true
            };
        }
        if (scope.attributes.options.xAxisLabel) {
            scope.attributes.options.value.chart.xAxis.axisLabel = scope.attributes.options.xAxisLabel;
            scope.attributes.options.value.chart.yAxis.axisLabel = scope.attributes.options.yAxisLabel;
        }
        if (scope.attributes.options.xAxisLabelDistance) {
            scope.attributes.options.value.chart.xAxis.axisLabelDistance = scope.attributes.options.xAxisLabelDistance;
            scope.attributes.options.value.chart.yAxis.axisLabelDistance = scope.attributes.options.yAxisLabelDistance;
        }
        if (scope.attributes.options.duration) {
            scope.attributes.options.value.chart.duration = scope.attributes.options.duration;
        }
        if (scope.attributes.options.showValues) {
            scope.attributes.options.value.chart.showValues = scope.attributes.options.showValues;
        }
        if (scope.attributes.options.showXAxis) {
            scope.attributes.options.value.chart.showXAxis = scope.attributes.options.showXAxis;
            scope.attributes.options.value.chart.showYAxis = scope.attributes.options.showYAxis;
        }
        if (scope.attributes.options.showControls) {
            scope.attributes.options.value.chart.showControls = scope.attributes.options.showControls;
        }
        if (scope.attributes.options.showLegend) {
            scope.attributes.options.value.chart.showLegend = scope.attributes.options.showLegend;
        }
        if (scope.attributes.options.stacked) {
            scope.attributes.options.value.chart.stacked = scope.attributes.options.stacked;
        }
        if (scope.attributes.options.useInteractiveGuideline) {
            scope.attributes.options.value.chart.useInteractiveGuideline = scope.attributes.options.useInteractiveGuideline;
        }
        if (scope.attributes.options.rescaleY) {
            scope.attributes.options.value.chart.rescaleY = scope.attributes.options.rescaleY;
        }
        if (scope.attributes.options.labelSunbeamLayout) {
            scope.attributes.options.value.chart.labelSunbeamLayout = scope.attributes.options.labelSunbeamLayout;
        }
        if (scope.attributes.options.labelThreshold) {
            scope.attributes.options.value.chart.labelThreshold = scope.attributes.options.labelThreshold;
        }
        if (scope.attributes.options.donutLabelsOutside) {
            scope.attributes.options.value.chart.donutLabelsOutside = scope.attributes.options.donutLabelsOutside;
        }
        if (scope.attributes.options.showLabels) {
            scope.attributes.options.value.chart.showLabels = scope.attributes.options.showLabels;
        }
        if (scope.attributes.options.cornerRadius) {
            scope.attributes.options.value.chart.cornerRadius = scope.attributes.options.cornerRadius;
        }
        if (scope.attributes.options.growOnHover) {
            scope.attributes.options.value.chart.growOnHover = scope.attributes.options.growOnHover;
        }
        if (scope.attributes.options.donutRatio) {
            scope.attributes.options.value.chart.donutRatio = scope.attributes.options.donutRatio;
        }

        var assignEvent = function(eventName, dispatch) {
            if (scope.attributes[eventName] && scope.attributes[eventName].value) {
                var normalizedEvent = removeBracketsFromEventListener(scope.attributes[eventName].value);
                dispatch[ chartEventNames[eventName] ] = scope.$gcscope[normalizedEvent];
            }
        };
        // global chart dispatch
        var generalDispatch = {};
        assignEvent('onbeforeupdate', generalDispatch);
        assignEvent('onstatechange', generalDispatch);
        assignEvent('onrenderend', generalDispatch);
        scope.attributes.options.value.chart.dispatch = generalDispatch;

        // specific chart dispatch
        var specificDispatch = {};
        assignEvent('onclick', specificDispatch);
        assignEvent('ondblclick', specificDispatch);
        assignEvent('onmouseover', specificDispatch);
        assignEvent('onmouseleave', specificDispatch);
        assignEvent('onmousemove', specificDispatch);
        assignEvent('onareaclick', specificDispatch);
        assignEvent('onareamouseover', specificDispatch);
        assignEvent('onareamouseleave', specificDispatch);
        scope.attributes.options.value.chart[chartTypeDef] = { dispatch: specificDispatch };

        refreshChartToReflectFlexSize(scope, false, $timeout);
    };
    api.setRunTimeChartNameVariable = function (scope, basectrl, component, chartTempName) {
        //first, create variable with real chart name and assign to it the value from temp chart name
        scope[component.attributes.name.value] = scope[chartTempName];

        //then, create this variable in parent scope (it does not exist there - not like other vars from attributes)
        scope.$parent_scope[component.attributes.name.value] = scope[component.attributes.name.value];

        //then, bind this scope variable
        basectrl.bindScopeVariable(scope, component.attributes.name.value);
    };

    api.watchDesignTimeAttributes = function (scope, $timeout, $filter) {
        scope.$watch('attributes.title.value', function (newValue) {
            scope.dfxDesignChartOptions.title.text = $filter('checkExpression')(newValue);
        });
        scope.$watch('attributes.options.xAxisLabel', function (newValue) {
            if (scope.dfxDesignChartOptions.chart.xAxis) scope.dfxDesignChartOptions.chart.xAxis.axisLabel = $filter('checkExpression')(newValue);
        });
        scope.$watch('attributes.options.yAxisLabel', function (newValue) {
            if (scope.dfxDesignChartOptions.chart.yAxis) scope.dfxDesignChartOptions.chart.yAxis.axisLabel = $filter('checkExpression')(newValue);
        });
        scope.$watch('attributes.flex.value', function (newValue, oldValue) {
            refreshChartToReflectFlexSize(scope, true, $timeout, oldValue);
        });
        scope.$watch('attributes.options.xAxisLabelDistance', function (newValue) {
            if (scope.dfxDesignChartOptions.chart.xAxis) scope.dfxDesignChartOptions.chart.xAxis.axisLabelDistance = parseInt(newValue) || -5;
        });
        scope.$watch('attributes.options.yAxisLabelDistance', function (newValue) {
            if (scope.dfxDesignChartOptions.chart.yAxis) scope.dfxDesignChartOptions.chart.yAxis.axisLabelDistance = parseInt(newValue) || -5;
        });
        scope.$watch('attributes.options.duration', function (newValue) {
            scope.dfxDesignChartOptions.chart.duration = parseInt(newValue) || 500;
        });
        scope.$watch('attributes.options.showValues', function (newValue) {
            scope.dfxDesignChartOptions.chart.showValues = newValue == 'false' ? false : true;
        });
        scope.$watch('attributes.options.showXAxis', function (newValue) {
            scope.dfxDesignChartOptions.chart.showXAxis = newValue == 'false' ? false : true;
        });
        scope.$watch('attributes.options.showYAxis', function (newValue) {
            scope.dfxDesignChartOptions.chart.showYAxis = newValue == 'false' ? false : true;
        });
        scope.$watch('attributes.options.showControls', function (newValue) {
            scope.dfxDesignChartOptions.chart.showControls = newValue == 'false' ? false : true;
        });
        scope.$watch('attributes.options.showLegend', function (newValue) {
            scope.dfxDesignChartOptions.chart.showLegend = newValue == 'false' ? false : true;
        });
        scope.$watch('attributes.options.stacked', function (newValue) {
            scope.dfxDesignChartOptions.chart.stacked = newValue == 'true' ? true : false;
        });
        scope.$watch('attributes.options.useInteractiveGuideline', function (newValue) {
            scope.dfxDesignChartOptions.chart.useInteractiveGuideline = newValue == 'false' ? false : true;
        });
        scope.$watch('attributes.options.rescaleY', function (newValue) {
            scope.dfxDesignChartOptions.chart.rescaleY = newValue == 'false' ? false : true;
        });
        scope.$watch('attributes.options.labelSunbeamLayout', function (newValue) {
            scope.dfxDesignChartOptions.chart.labelSunbeamLayout = newValue == 'true' ? true : false;
        });
        scope.$watch('attributes.options.labelThreshold', function (newValue) {
            scope.dfxDesignChartOptions.chart.labelThreshold = parseFloat(newValue) || 0.01;
        });
        scope.$watch('attributes.options.donutLabelsOutside', function (newValue) {
            scope.dfxDesignChartOptions.chart.donutLabelsOutside = newValue == 'false' ? false : true;
        });
        scope.$watch('attributes.options.showLabels', function (newValue) {
            scope.dfxDesignChartOptions.chart.showLabels = newValue == 'false' ? false : true;
        });
        scope.$watch('attributes.options.cornerRadius', function (newValue) {
            scope.dfxDesignChartOptions.chart.cornerRadius = parseFloat(newValue) || 0;
        });
        scope.$watch('attributes.options.growOnHover', function (newValue) {
            scope.dfxDesignChartOptions.chart.growOnHover = newValue == 'false' ? false : true;
        });
        scope.$watch('attributes.options.donutRatio', function (newValue) {
            scope.dfxDesignChartOptions.chart.donutRatio = parseFloat(newValue) || 0.35;
        });
    };
    api.watchRunTimeAttributes = function (scope, $timeout) {
        scope.$gcscope.$watch(scope.attributes.title.value, function(newValue) {
            scope.attributes.options.value.title.text = newValue;
        });
        if (scope.attributes.options.xAxisLabel) {
            scope.$gcscope.$watch(scope.attributes.options.xAxisLabel, function (newValue) {
                scope.attributes.options.value.chart.xAxis.axisLabel = newValue;
            });
            scope.$gcscope.$watch(scope.attributes.options.yAxisLabel, function (newValue) {
                scope.attributes.options.value.chart.yAxis.axisLabel = newValue;
            });
        }
        if (scope.attributes.options.xAxisLabelDistance) {
            scope.$gcscope.$watch(scope.attributes.options.xAxisLabelDistance, function (newValue) {
                scope.attributes.options.value.chart.xAxis.axisLabelDistance = newValue;
            });
            scope.$gcscope.$watch(scope.attributes.options.yAxisLabelDistance, function (newValue) {
                scope.attributes.options.value.chart.yAxis.axisLabelDistance = newValue;
            });
        }
        if (scope.attributes.options.duration) {
            scope.$gcscope.$watch(scope.attributes.options.duration, function (newValue) {
                scope.attributes.options.value.chart.duration = newValue;
            });
        }
        if (scope.attributes.options.showValues) {
            scope.$gcscope.$watch(scope.attributes.options.showValues, function (newValue) {
                scope.attributes.options.value.chart.showValues = newValue;
                refreshChartToReflectFlexSize(scope, false, $timeout);
            });
        }
        if (scope.attributes.options.showXAxis) {
            scope.$gcscope.$watch(scope.attributes.options.showXAxis, function (newValue) {
                scope.attributes.options.value.chart.showXAxis = newValue;
            });
            scope.$gcscope.$watch(scope.attributes.options.showYAxis, function (newValue) {
                scope.attributes.options.value.chart.showYAxis = newValue;
            });
        }
        if (scope.attributes.options.showControls) {
            scope.$gcscope.$watch(scope.attributes.options.showControls, function (newValue) {
                scope.attributes.options.value.chart.showControls = newValue;
                refreshChartToReflectFlexSize(scope, false, $timeout);
            });
        }
        if (scope.attributes.options.showLegend) {
            scope.$gcscope.$watch(scope.attributes.options.showLegend, function (newValue) {
                scope.attributes.options.value.chart.showLegend = newValue;
                refreshChartToReflectFlexSize(scope, false, $timeout);
            });
        }
        if (scope.attributes.options.stacked) {
            scope.$gcscope.$watch(scope.attributes.options.stacked, function (newValue) {
                scope.attributes.options.value.chart.stacked = newValue;
                refreshChartToReflectFlexSize(scope, false, $timeout);
            });
        }
        if (scope.attributes.options.useInteractiveGuideline) {
            scope.$gcscope.$watch(scope.attributes.options.useInteractiveGuideline, function (newValue) {
                scope.attributes.options.value.chart.useInteractiveGuideline = newValue;
                refreshChartToReflectFlexSize(scope, false, $timeout);
            });
        }
        if (scope.attributes.options.rescaleY) {
            scope.$gcscope.$watch(scope.attributes.options.rescaleY, function (newValue) {
                scope.attributes.options.value.chart.rescaleY = newValue;
                refreshChartToReflectFlexSize(scope, false, $timeout);
            });
        }
        if (scope.attributes.options.labelSunbeamLayout) {
            scope.$gcscope.$watch(scope.attributes.options.labelSunbeamLayout, function (newValue) {
                scope.attributes.options.value.chart.labelSunbeamLayout = newValue;
            });
        }
        if (scope.attributes.options.labelThreshold) {
            scope.$gcscope.$watch(scope.attributes.options.labelThreshold, function (newValue) {
                scope.attributes.options.value.chart.labelThreshold = newValue;
            });
        }
        if (scope.attributes.options.donutLabelsOutside) {
            scope.$gcscope.$watch(scope.attributes.options.donutLabelsOutside, function (newValue) {
                scope.attributes.options.value.chart.donutLabelsOutside = newValue;
            });
        }
        if (scope.attributes.options.showLabels) {
            scope.$gcscope.$watch(scope.attributes.options.showLabels, function (newValue) {
                scope.attributes.options.value.chart.showLabels = newValue;
            });
        }
        if (scope.attributes.options.cornerRadius) {
            scope.$gcscope.$watch(scope.attributes.options.cornerRadius, function (newValue) {
                scope.attributes.options.value.chart.cornerRadius = newValue;
            });
        }
        if (scope.attributes.options.growOnHover) {
            scope.$gcscope.$watch(scope.attributes.options.growOnHover, function (newValue) {
                scope.attributes.options.value.chart.growOnHover = newValue;
            });
        }
        if (scope.attributes.options.donutRatio) {
            scope.$gcscope.$watch(scope.attributes.options.donutRatio, function (newValue) {
                scope.attributes.options.value.chart.donutRatio = newValue;
            });
        }
    };

    return api;
}());

dfxGControls.directive('dfxGcWebBarchart', ['$timeout', '$filter', function($timeout, $filter) {
    return {
        restrict: 'A',
        require: '^dfxGcWebBase',
        scope: true,
        templateUrl: function( el, attrs ) {
            if (angular.isDefined(attrs.dfxGcEdit)) {
                return '/gcontrols/web/barchart_edit.html';
            } else if (angular.isDefined(attrs.dfxGcDesign)) {
                return '/gcontrols/web/barchart_design.html';
            } else {
                return '/gcontrols/web/barchart.html';
            }
        },
        link: function(scope, element, attrs, basectrl) {
            var chartTempName = 'chartTempName_' + scope.component_id,
                component = scope.getComponent(element);

            var chartData    = [{
                key:    "Cumulative Return",
                values: [
                    {
                        "label": "A",
                        "value": -29.76
                    },
                    {
                        "label": "B",
                        "value": 32.80
                    },
                    {
                        "label": "C",
                        "value": 196.45
                    },
                    {
                        "label": "D",
                        "value": -98.07
                    },
                    {
                        "label": "E",
                        "value": -13.92
                    }
                ]
            }];
            var chartOptions = {
                chart: {
                    type: 'discreteBarChart',
                    margin : {
                        top: 20,
                        right: 20,
                        bottom: 50,
                        left: 55
                    },
                    x: function(d){return d.label;},
                    y: function(d){return d.value;},
                    showValues:  true,
                    valueFormat: function (d) {
                        return d3.format(',.4f')(d);
                    },
                    duration:    500,
                    xAxis:       {
                        axisLabel: 'X Axis',
                        axisLabelDistance: -5
                    },
                    yAxis:       {
                        axisLabel: 'Y Axis',
                        axisLabelDistance: -5
                    }
                },
                title: {
                    text: 'Bar Chart',
                    enable: true
                }
            };

            basectrl.init(scope, element, component, attrs, 'barchart').then(function () {
                if (scope.attributes.dynamicOptions) scope.attributes.dynamicOptions.status = "overridden";
                scope.attributes.flex.status = "overridden";

                if (angular.isDefined(attrs.dfxGcEdit) || angular.isDefined(attrs.dfxGcDesign)) { // DESIGN TIME
                    DfxGcChartUtil.setDesignTimeAttributes(scope, $timeout, $filter);
                    DfxGcChartUtil.watchDesignTimeAttributes(scope, $timeout, $filter);
                } else {
                    DfxGcChartUtil.setRunTimeChartNameVariable(scope, basectrl, component, chartTempName);

                    basectrl.bindScopeVariable(scope, component.attributes.title.value);

                    // dynamicOptions is a priority over all static options, title and events (ex. onclick)
                    if (scope.attributes.dynamicOptions && scope.attributes.dynamicOptions.value) {
                        scope.attributes.options.value = scope[scope.attributes.dynamicOptions.value];
                    } else {
                        scope.attributes.options.value = chartOptions;

                        var eventsList = {
                            onclick: 'elementClick',
                            ondblclick: 'elementDblClick',
                            onmouseover: 'elementMouseover',
                            onmouseleave: 'elementMouseout',
                            onmousemove: 'elementMousemove',
                            onbeforeupdate: 'beforeUpdate',
                            onrenderend: 'renderEnd'
                        };

                        DfxGcChartUtil.setRunTimeAttributes(scope, 'discretebar', eventsList, $timeout);
                        DfxGcChartUtil.watchRunTimeAttributes(scope, $timeout);
                    }
                }

                DfxGcChartUtil.adjustContainerHeight(scope);
            });

            DfxGcChartUtil.setAttributesBeforeInit(scope, attrs, chartOptions, chartData, chartTempName);
        }
    }
}]);

dfxGControls.directive('dfxGcWebHzbarchart', ['$timeout', '$filter', function($timeout, $filter) {
    return {
        restrict: 'A',
        require: '^dfxGcWebBase',
        scope: true,
        templateUrl: function( el, attrs ) {
            if (angular.isDefined(attrs.dfxGcEdit)) {
                return '/gcontrols/web/hzbarchart_edit.html';
            } else if (angular.isDefined(attrs.dfxGcDesign)) {
                return '/gcontrols/web/hzbarchart_design.html';
            } else {
                return '/gcontrols/web/hzbarchart.html';
            }
        },
        link: function(scope, element, attrs, basectrl) {
            var chartTempName = 'chartTempName_' + scope.component_id,
                component = scope.getComponent(element);

            var chartData = [
                {
                    "key": "Series1",
                    "color": "#d62728",
                    "values": [
                        {
                            "label" : "Group A" ,
                            "value" : -1.874
                        },
                        {
                            "label" : "Group B" ,
                            "value" : -8.096
                        },
                        {
                            "label" : "Group C" ,
                            "value" : -0.570
                        },
                        {
                            "label" : "Group D" ,
                            "value" : -2.417
                        },
                        {
                            "label" : "Group E" ,
                            "value" : -0.720
                        }
                    ]
                },
                {
                    "key": "Series2",
                    "color": "#1f77b4",
                    "values": [
                        {
                            "label" : "Group A" ,
                            "value" : 25.307
                        },
                        {
                            "label" : "Group B" ,
                            "value" : 16.756
                        },
                        {
                            "label" : "Group C" ,
                            "value" : 18.451
                        },
                        {
                            "label" : "Group D" ,
                            "value" : 8.614
                        },
                        {
                            "label" : "Group E" ,
                            "value" : 7.808
                        }
                    ]
                }
            ];
            var chartOptions = {
                chart: {
                    type: 'multiBarHorizontalChart',
                    margin : {
                        top: 20,
                        right: 20,
                        bottom: 50,
                        left: 55
                    },
                    x: function(d){return d.label;},
                    y: function(d){return d.value;},
                    showControls: true,
                    showValues:  true,
                    duration:    500,
                    xAxis:       {
                        showMaxMin: false,
                        axisLabel: ''
                    },
                    yAxis:       {
                        axisLabel: 'Values',
                        tickFormat: function(d) {
                            return d3.format(',.2f')(d);
                        }
                    }
                },
                title: {
                    text: 'Horizontal Bar Chart',
                    enable: true
                }
            };

            basectrl.init(scope, element, component, attrs, 'hzbarchart').then(function () {
                if (scope.attributes.dynamicOptions) scope.attributes.dynamicOptions.status = "overridden";
                scope.attributes.flex.status = "overridden";

                if (angular.isDefined(attrs.dfxGcEdit) || angular.isDefined(attrs.dfxGcDesign)) { // DESIGN TIME
                    DfxGcChartUtil.setDesignTimeAttributes(scope, $timeout, $filter);
                    DfxGcChartUtil.watchDesignTimeAttributes(scope, $timeout, $filter);
                } else {
                    DfxGcChartUtil.setRunTimeChartNameVariable(scope, basectrl, component, chartTempName);

                    basectrl.bindScopeVariable(scope, component.attributes.title.value);

                    // dynamicOptions is a priority over all static options, title and events (ex. onclick)
                    if (scope.attributes.dynamicOptions && scope.attributes.dynamicOptions.value) {
                        scope.attributes.options.value = scope[scope.attributes.dynamicOptions.value];
                    } else {
                        scope.attributes.options.value = chartOptions;

                        var eventsList = {
                            onclick: 'elementClick',
                            ondblclick: 'elementDblClick',
                            onmouseover: 'elementMouseover',
                            onmouseleave: 'elementMouseout',
                            onmousemove: 'elementMousemove',
                            onstatechange: 'stateChange',
                            onrenderend: 'renderEnd'
                        };

                        DfxGcChartUtil.setRunTimeAttributes(scope, 'multibar', eventsList, $timeout);
                        DfxGcChartUtil.watchRunTimeAttributes(scope, $timeout);
                    }
                }

                DfxGcChartUtil.adjustContainerHeight(scope);
            });

            DfxGcChartUtil.setAttributesBeforeInit(scope, attrs, chartOptions, chartData, chartTempName);
        }
    }
}]);

dfxGControls.directive('dfxGcWebPiechart', ['$timeout', '$filter', function($timeout, $filter) {
    return {
        restrict: 'A',
        require: '^dfxGcWebBase',
        scope: true,
        templateUrl: function( el, attrs ) {
            if (angular.isDefined(attrs.dfxGcEdit)) {
                return '/gcontrols/web/piechart_edit.html';
            } else if (angular.isDefined(attrs.dfxGcDesign)) {
                return '/gcontrols/web/piechart_design.html';
            } else {
                return '/gcontrols/web/piechart.html';
            }
        },
        link: function(scope, element, attrs, basectrl) {
            var chartTempName = 'chartTempName_' + scope.component_id,
                component = scope.getComponent(element);

            var chartData    = [
                {
                    key: "One",
                    y: 5
                },
                {
                    key: "Two",
                    y: 2
                },
                {
                    key: "Three",
                    y: 9
                },
                {
                    key: "Four",
                    y: 7
                },
                {
                    key: "Five",
                    y: 4
                }
            ];
            var chartOptions = {
                chart: {
                    type: 'pieChart',
                    margin : {
                        top: 20,
                        right: 20,
                        bottom: 50,
                        left: 55
                    },
                    x: function(d){return d.key;},
                    y: function(d){return d.y;},
                    showLabels: true,
                    duration: 500,
                    labelThreshold: 0.01,
                    labelSunbeamLayout: true,
                    legend: {
                        margin: {
                            top: 5,
                            right: 5,
                            bottom: 5,
                            left: 0
                        }
                    }
                },
                title: {
                    text: 'Pie Chart',
                    enable: true
                }
            };

            basectrl.init(scope, element, component, attrs, 'piechart').then(function () {
                if (scope.attributes.dynamicOptions) scope.attributes.dynamicOptions.status = "overridden";
                scope.attributes.flex.status = "overridden";

                if (angular.isDefined(attrs.dfxGcEdit) || angular.isDefined(attrs.dfxGcDesign)) { // DESIGN TIME
                    DfxGcChartUtil.setDesignTimeAttributes(scope, $timeout, $filter);
                    DfxGcChartUtil.watchDesignTimeAttributes(scope, $timeout, $filter);
                } else {
                    DfxGcChartUtil.setRunTimeChartNameVariable(scope, basectrl, component, chartTempName);

                    basectrl.bindScopeVariable(scope, component.attributes.title.value);

                    // dynamicOptions is a priority over all static options, title and events (ex. onclick)
                    if (scope.attributes.dynamicOptions && scope.attributes.dynamicOptions.value) {
                        scope.attributes.options.value = scope[scope.attributes.dynamicOptions.value];
                    } else {
                        scope.attributes.options.value = chartOptions;

                        var eventsList = {
                            onclick: 'elementClick',
                            ondblclick: 'elementDblClick',
                            onmouseover: 'elementMouseover',
                            onmouseleave: 'elementMouseout',
                            onmousemove: 'elementMousemove',
                            onstatechange: 'stateChange',
                            onrenderend: 'renderEnd'
                        };

                        DfxGcChartUtil.setRunTimeAttributes(scope, 'pie', eventsList, $timeout);
                        DfxGcChartUtil.watchRunTimeAttributes(scope, $timeout);
                    }
                }

                DfxGcChartUtil.adjustContainerHeight(scope);
            });

            DfxGcChartUtil.setAttributesBeforeInit(scope, attrs, chartOptions, chartData, chartTempName);
        }
    }
}]);

dfxGControls.directive('dfxGcWebDonutchart', ['$timeout', '$filter', function($timeout, $filter) {
    return {
        restrict: 'A',
        require: '^dfxGcWebBase',
        scope: true,
        templateUrl: function( el, attrs ) {
            if (angular.isDefined(attrs.dfxGcEdit)) {
                return '/gcontrols/web/donutchart_edit.html';
            } else if (angular.isDefined(attrs.dfxGcDesign)) {
                return '/gcontrols/web/donutchart_design.html';
            } else {
                return '/gcontrols/web/donutchart.html';
            }
        },
        link: function(scope, element, attrs, basectrl) {
            var chartTempName = 'chartTempName_' + scope.component_id,
                component = scope.getComponent(element);

            var chartData    = [
                {
                    key: "One",
                    y: 5
                },
                {
                    key: "Two",
                    y: 2
                },
                {
                    key: "Three",
                    y: 9
                },
                {
                    key: "Four",
                    y: 7
                },
                {
                    key: "Five",
                    y: 4
                }
            ];
            var chartOptions = {
                chart: {
                    type: 'pieChart',
                    donut: true,
                    margin : {
                        top: 20,
                        right: 20,
                        bottom: 50,
                        left: 55
                    },
                    x: function(d){return d.key;},
                    y: function(d){return d.y;},
                    showLabels: true,
                    donutRatio: 0.35,//default
                    duration: 500,
                    legend: {
                        margin: {
                            top: 5,
                            right: 35,
                            bottom: 5,
                            left: 0
                        }
                    },
                    pie: {
                        startAngle: function(d) { return d.startAngle - Math.PI },
                        endAngle: function(d) { return d.endAngle - Math.PI }
                    }
                },
                title: {
                    text: 'Donut Chart',
                    enable: true
                }
            };

            basectrl.init(scope, element, component, attrs, 'donutchart').then(function () {
                if (scope.attributes.dynamicOptions) scope.attributes.dynamicOptions.status = "overridden";
                scope.attributes.flex.status = "overridden";

                if (angular.isDefined(attrs.dfxGcEdit) || angular.isDefined(attrs.dfxGcDesign)) { // DESIGN TIME
                    DfxGcChartUtil.setDesignTimeAttributes(scope, $timeout, $filter);
                    DfxGcChartUtil.watchDesignTimeAttributes(scope, $timeout, $filter);
                } else {
                    DfxGcChartUtil.setRunTimeChartNameVariable(scope, basectrl, component, chartTempName);

                    basectrl.bindScopeVariable(scope, component.attributes.title.value);

                    // dynamicOptions is a priority over all static options, title and events (ex. onclick)
                    if (scope.attributes.dynamicOptions && scope.attributes.dynamicOptions.value) {
                        scope.attributes.options.value = scope[scope.attributes.dynamicOptions.value];
                    } else {
                        scope.attributes.options.value = chartOptions;

                        var eventsList = {
                            onclick: 'elementClick',
                            ondblclick: 'elementDblClick',
                            onmouseover: 'elementMouseover',
                            onmouseleave: 'elementMouseout',
                            onmousemove: 'elementMousemove',
                            onstatechange: 'stateChange',
                            onrenderend: 'renderEnd'
                        };

                        DfxGcChartUtil.setRunTimeAttributes(scope, 'pie', eventsList, $timeout);
                        DfxGcChartUtil.watchRunTimeAttributes(scope, $timeout);
                    }
                }

                DfxGcChartUtil.adjustContainerHeight(scope);
            });

            DfxGcChartUtil.setAttributesBeforeInit(scope, attrs, chartOptions, chartData, chartTempName);
        }
    }
}]);

dfxGControls.directive('dfxGcWebLinechart', ['$timeout', '$filter', function($timeout, $filter) {
    return {
        restrict: 'A',
        require: '^dfxGcWebBase',
        scope: true,
        templateUrl: function( el, attrs ) {
            if (angular.isDefined(attrs.dfxGcEdit)) {
                return '/gcontrols/web/linechart_edit.html';
            } else if (angular.isDefined(attrs.dfxGcDesign)) {
                return '/gcontrols/web/linechart_design.html';
            } else {
                return '/gcontrols/web/linechart.html';
            }
        },
        link: function(scope, element, attrs, basectrl) {
            var chartTempName = 'chartTempName_' + scope.component_id,
                component = scope.getComponent(element);

            function lineChartDesignData() {
                var sin = [], sin2 = [],
                    cos = [];

                //Data is represented as an array of {x,y} pairs.
                for (var i = 0; i < 100; i++) {
                    sin.push({x: i, y: Math.sin(i / 10)});
                    sin2.push({x: i, y: i % 10 == 5 ? null : Math.sin(i / 10) * 0.25 + 0.5});
                    cos.push({x: i, y: .5 * Math.cos(i / 10 + 2) + Math.random() / 10});
                }

                //Line chart data should be sent as an array of series objects.
                return [
                    {
                        values: sin,      //values - represents the array of {x,y} data points
                        key:    'Sine Wave', //key  - the name of the series.
                        color:  '#ff7f0e'  //color - optional: choose your own line color.
                    },
                    {
                        values: cos,
                        key:    'Cosine Wave',
                        color:  '#2ca02c'
                    },
                    {
                        values: sin2,
                        key:    'Another sine wave',
                        color:  '#7777ff',
                        area:   true      //area - set to true if you want this line to turn into a filled area chart.
                    }
                ];
            };
            var chartData    = lineChartDesignData();

            var chartOptions = {
                chart: {
                    type: 'lineChart',
                    margin : {
                        top: 20,
                        right: 20,
                        bottom: 50,
                        left: 55
                    },
                    x: function(d){return d.x;},
                    y: function(d){return d.y;},
                    useInteractiveGuideline: true,
                    xAxis: {
                        axisLabel: 'X Axis'
                    },
                    yAxis: {
                        axisLabel: 'Y Axis',
                        axisLabelDistance: -10
                    }
                },
                title: {
                    text: 'Line Chart',
                    enable: true
                }
            };

            basectrl.init(scope, element, component, attrs, 'linechart').then(function () {
                if (scope.attributes.dynamicOptions) scope.attributes.dynamicOptions.status = "overridden";
                scope.attributes.flex.status = "overridden";

                if (angular.isDefined(attrs.dfxGcEdit) || angular.isDefined(attrs.dfxGcDesign)) { // DESIGN TIME
                    DfxGcChartUtil.setDesignTimeAttributes(scope, $timeout, $filter);
                    DfxGcChartUtil.watchDesignTimeAttributes(scope, $timeout, $filter);
                } else {
                    DfxGcChartUtil.setRunTimeChartNameVariable(scope, basectrl, component, chartTempName);

                    basectrl.bindScopeVariable(scope, component.attributes.title.value);

                    // dynamicOptions is a priority over all static options, title and events (ex. onclick)
                    if (scope.attributes.dynamicOptions && scope.attributes.dynamicOptions.value) {
                        scope.attributes.options.value = scope[scope.attributes.dynamicOptions.value];
                    } else {
                        scope.attributes.options.value = chartOptions;

                        var eventsList = {
                            onclick: 'elementClick',
                            onmouseover: 'elementMouseover',
                            onmouseleave: 'elementMouseout',
                            onstatechange: 'stateChange',
                            onrenderend: 'renderEnd'
                        };

                        DfxGcChartUtil.setRunTimeAttributes(scope, 'lines', eventsList, $timeout);
                        DfxGcChartUtil.watchRunTimeAttributes(scope, $timeout);
                    }
                }

                DfxGcChartUtil.adjustContainerHeight(scope);
            });

            DfxGcChartUtil.setAttributesBeforeInit(scope, attrs, chartOptions, chartData, chartTempName);
        }
    }
}]);

dfxGControls.directive('dfxGcWebCmlinechart', ['$timeout', '$filter', function($timeout, $filter) {
    return {
        restrict: 'A',
        require: '^dfxGcWebBase',
        scope: true,
        templateUrl: function( el, attrs ) {
            if (angular.isDefined(attrs.dfxGcEdit)) {
                return '/gcontrols/web/cmlinechart_edit.html';
            } else if (angular.isDefined(attrs.dfxGcDesign)) {
                return '/gcontrols/web/cmlinechart_design.html';
            } else {
                return '/gcontrols/web/cmlinechart.html';
            }
        },
        link: function(scope, element, attrs, basectrl) {
            var chartTempName = 'chartTempName_' + scope.component_id,
                component = scope.getComponent(element);

            var chartData    = [
                {
                    key: "Long",
                    values: [ [ 1283227200000, 248.308], [ 1285819200000, 278.148], [ 1288497600000, 292.692], [ 1291093200000, 300.842], [ 1293771600000, 326.172]],
                    mean: 250
                },
                {
                    key: "Short",
                    values: [ [ 1283227200000, -85.397], [ 1285819200000, -94.738], [ 1288497600000, -98.661], [ 1291093200000, -99.609], [ 1293771600000, -103.570]],
                    mean: -60
                }
            ];
            var chartOptions = {
                chart: {
                    type: 'cumulativeLineChart',
                    margin : {
                        top: 20,
                        right: 20,
                        bottom: 50,
                        left: 55
                    },
                    x: function(d){ return d[0]; },
                    y: function(d){ return d[1]/100; },
                    average: function(d) { return d.mean/100; },

                    color: d3.scale.category10().range(),
                    duration: 300,
                    useInteractiveGuideline: true,
                    clipVoronoi: false,
                    interactive: true,
                    rescaleY: true,

                    xAxis: {
                        axisLabel: 'X Axis',
                        tickFormat: function(d) {
                            return d3.time.format('%m/%d/%y')(new Date(d))
                        },
                        showMaxMin: false,
                        staggerLabels: true
                    },

                    yAxis: {
                        tickFormat: function(d){
                            return d3.format(',.1%')(d);
                        },
                        axisLabelDistance: 20
                    }
                },
                title: {
                    text: 'Cumulative Line Chart',
                    enable: true
                }
            };

            basectrl.init(scope, element, component, attrs, 'cmlinechart').then(function () {
                if (scope.attributes.dynamicOptions) scope.attributes.dynamicOptions.status = "overridden";
                scope.attributes.flex.status = "overridden";

                if (angular.isDefined(attrs.dfxGcEdit) || angular.isDefined(attrs.dfxGcDesign)) { // DESIGN TIME
                    DfxGcChartUtil.setDesignTimeAttributes(scope, $timeout, $filter);
                    DfxGcChartUtil.watchDesignTimeAttributes(scope, $timeout, $filter);
                } else {
                    DfxGcChartUtil.setRunTimeChartNameVariable(scope, basectrl, component, chartTempName);

                    basectrl.bindScopeVariable(scope, component.attributes.title.value);

                    // dynamicOptions is a priority over all static options, title and events (ex. onclick)
                    if (scope.attributes.dynamicOptions && scope.attributes.dynamicOptions.value) {
                        scope.attributes.options.value = scope[scope.attributes.dynamicOptions.value];
                    } else {
                        scope.attributes.options.value = chartOptions;

                        var eventsList = {
                            onclick: 'elementClick',
                            onmouseover: 'elementMouseover',
                            onmouseleave: 'elementMouseout',
                            onstatechange: 'stateChange',
                            onrenderend: 'renderEnd'
                        };

                        DfxGcChartUtil.setRunTimeAttributes(scope, 'interactiveLayer', eventsList, $timeout);
                        DfxGcChartUtil.watchRunTimeAttributes(scope, $timeout);
                    }
                }

                DfxGcChartUtil.adjustContainerHeight(scope);
            });

            DfxGcChartUtil.setAttributesBeforeInit(scope, attrs, chartOptions, chartData, chartTempName);
        }
    }
}]);

dfxGControls.directive('dfxGcWebAreachart', ['$timeout', '$filter', function($timeout, $filter) {
    return {
        restrict: 'A',
        require: '^dfxGcWebBase',
        scope: true,
        templateUrl: function( el, attrs ) {
            if (angular.isDefined(attrs.dfxGcEdit)) {
                return '/gcontrols/web/areachart_edit.html';
            } else if (angular.isDefined(attrs.dfxGcDesign)) {
                return '/gcontrols/web/areachart_design.html';
            } else {
                return '/gcontrols/web/areachart.html';
            }
        },
        link: function(scope, element, attrs, basectrl) {
            var chartTempName = 'chartTempName_' + scope.component_id,
                component = scope.getComponent(element);

            var chartData    = [
                {
                    "key" : "North America" ,
                    "values" : [ [ 1320033600000 , 26.672] , [ 1322629200000 , 27.297] , [ 1325307600000 , 20.174] , [ 1327986000000 , 19.631] , [ 1330491600000 , 20.366] , [ 1333166400000 , 19.284] , [ 1335758400000 , 19.157]]
                },
                {
                    "key" : "Europe" ,
                    "values" : [ [ 1320033600000 , 35.611] , [ 1322629200000 , 35.320] , [ 1325307600000 , 31.564] , [ 1327986000000 , 32.074] , [ 1330491600000 , 35.053] , [ 1333166400000 , 33.873] , [ 1335758400000 , 32.321]]
                },
                {
                    "key" : "Australia" ,
                    "values" : [ [ 1320033600000 , 5.453] , [ 1322629200000 , 7.672] , [ 1325307600000 , 8.014] , [ 1327986000000 , 0] , [ 1330491600000 , 0] , [ 1333166400000 , 0] , [ 1335758400000 , 0]]
                }
            ];
            var chartOptions = {
                chart: {
                    type: 'stackedAreaChart',
                    margin : {
                        top: 20,
                        right: 20,
                        bottom: 50,
                        left: 55
                    },
                    x: function(d){return d[0];},
                    y: function(d){return d[1];},
                    useVoronoi: false,
                    clipEdge: true,
                    duration: 100,
                    useInteractiveGuideline: true,
                    xAxis: {
                        showMaxMin: false,
                        tickFormat: function(d) {
                            return d3.time.format('%x')(new Date(d))
                        },
                        axisLabel: 'X Axis'
                    },
                    yAxis: {
                        tickFormat: function(d){
                            return d3.format(',.2f')(d);
                        }
                    }
                },
                title: {
                    text: 'Stacked Area Chart',
                    enable: true
                }
            };

            basectrl.init(scope, element, component, attrs, 'areachart').then(function () {
                if (scope.attributes.dynamicOptions) scope.attributes.dynamicOptions.status = "overridden";
                scope.attributes.flex.status = "overridden";

                if (angular.isDefined(attrs.dfxGcEdit) || angular.isDefined(attrs.dfxGcDesign)) { // DESIGN TIME
                    DfxGcChartUtil.setDesignTimeAttributes(scope, $timeout, $filter);
                    DfxGcChartUtil.watchDesignTimeAttributes(scope, $timeout, $filter);
                } else {
                    DfxGcChartUtil.setRunTimeChartNameVariable(scope, basectrl, component, chartTempName);

                    basectrl.bindScopeVariable(scope, component.attributes.title.value);

                    // dynamicOptions is a priority over all static options, title and events (ex. onclick)
                    if (scope.attributes.dynamicOptions && scope.attributes.dynamicOptions.value) {
                        scope.attributes.options.value = scope[scope.attributes.dynamicOptions.value];
                    } else {
                        scope.attributes.options.value = chartOptions;

                        var eventsList = {
                            onareaclick: 'areaClick',
                            onareamouseover: 'areaMouseover',
                            onareamouseleave: 'areaMouseout',
                            onstatechange: 'stateChange',
                            onrenderend: 'renderEnd'
                        };

                        DfxGcChartUtil.setRunTimeAttributes(scope, 'stacked', eventsList, $timeout);
                        DfxGcChartUtil.watchRunTimeAttributes(scope, $timeout);
                    }
                }

                DfxGcChartUtil.adjustContainerHeight(scope);
            });

            DfxGcChartUtil.setAttributesBeforeInit(scope, attrs, chartOptions, chartData, chartTempName);
        }
    }
}]);

dfxGControls.directive('dfxGcWebKnob', ['$timeout', '$compile', function($timeout, $compile) {
    return {
        restrict:    'A',
        require:     '^dfxGcWebBase',
        scope:       true,
        templateUrl: function (el, attrs) {
            if (angular.isDefined(attrs.dfxGcEdit)) {
                return '/gcontrols/web/knob_edit.html';
            } else if (angular.isDefined(attrs.dfxGcDesign)) {
                return '/gcontrols/web/knob_design.html';
            } else {
                return '/gcontrols/web/knob.html';
            }
        },
        link: function (scope, element, attrs, basectrl) {
            var component = scope.$parent.getComponent(element);
            basectrl.init(scope, element, component, attrs, 'knob').then(function () {
                scope.attributes.binding.status = 'overridden';
                if ( !scope.attributes.options.value.hasOwnProperty('size') ){
                    scope.attributes.options.value = {
                        "animate": {"enabled":true,"duration":1000,"ease":"bounce"},
                        "barCap": 20,
                        "barColor": "#e65d5d",
                        "barWidth": 40,
                        "bgColor": "",
                        "fontSize": "auto",
                        "displayInput": true,
                        "dynamicOptions": true,
                        "displayPrevious": false,
                        "size": 300,
                        "min": 0,
                        "max": 100,
                        "step": 1,
                        "startAngle": 0,
                        "endAngle": 360,
                        "textColor": "#222222",
                        "prevBarColor": "rgba(0,0,0,0)",
                        "trackColor": "#ffe6e6",
                        "trackWidth": 50,
                        "readOnly": false,
                        "unit": "%",
                        "subText": {"enabled":true, "text":"Sub text", "color":"#808080", "font":"auto"},
                        "skin": {"type":"tron","width":10,"color":"rgba(255,0,0,.5)","spaceWidth":5},
                        "scale": {"enabled":true,"type":"lines","color":"#808080","width":3,"quantity":20,"height":10,"spaceWidth":15}
                    }
                }
                scope.attributes.options.status = 'overridden';
                $timeout(function() {
                    if (!angular.isDefined(attrs.dfxGcEdit) && !angular.isDefined(attrs.dfxGcDesign)) {
                        if(scope.attributes.binding.value!=='' && isNaN(scope.attributes.binding.value)){
                            scope.$gcscope = scope;
                            basectrl.bindScopeVariable(scope, component.attributes.binding.value);
                            $('#'+component.id+'_dfx_ng_knob').empty().html('<ui-knob value="$gcscope[attributes.binding.value]" options="attributes.options.value"></ui-knob>');
                        } else {
                            $('#'+component.id+'_dfx_ng_knob').empty().html('<ui-knob value="attributes.binding.value" options="attributes.options.value"></ui-knob>');
                        }
                    } else {
                        $('#'+component.id+'_dfx_ng_knob').empty().html('<ui-knob value="65" options="attributes.options.value"></ui-knob>');
                    }
                    $timeout(function() {
                        $compile($('#'+component.id+'_dfx_ng_knob').contents())(scope);
                    }, 0);
                }, 0);
            });
        }
    }
}]);
