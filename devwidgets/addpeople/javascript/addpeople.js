/*
 * Licensed to the Sakai Foundation (SF) under one
 * or more contributor license agreements. See the NOTICE file
 * distributed with this work for additional information
 * regarding copyright ownership. The SF licenses this file
 * to you under the Apache License, Version 2.0 (the
 * "License"); you may not use this file except in compliance
 * with the License. You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied. See the License for the
 * specific language governing permissions and limitations under the License.
 */

/*
 * Dependencies
 *
 * /dev/lib/jquery/plugins/jqmodal.sakai-edited.js
 */

require(["jquery", "sakai/sakai.api.core"], function($, sakai) {

    /**
     * @name sakai_global.addpeople
     *
     * @class addpeople
     *
     * @description
     * addpeople widget
     *
     * @version 0.0.1
     * @param {String} tuid Unique id of the widget
     * @param {Boolean} showSettings Show the settings of the widget or not
     */
    sakai_global.addpeople = function(tuid, showSettings, widgetData){


        /////////////////////////////
        // CONFIGURATION VARIABLES //
        /////////////////////////////

        var $rootel = $("#" + tuid);

        // Containers
        var $addpeopleContainer = $("#addpeople_container", $rootel);
        var $addpeopleContactsContainer = $("#addpeople_contacts_container", $rootel);
        var $addpeopleSelectedContactsContainer = $("#addpeople_selected_contacts_container", $rootel);
        var $addpeopleMembersAutoSuggest = $("#addpeople_members_autosuggest", $rootel);

        // Templates
        var addpeopleContactsTemplate = "addpeople_contacts_template";
        var addpeopleSelectedContactsTemplate = "addpeople_selected_contacts_template";

        // Elements
        var $addpeopleSelectAllContacts = $("#addpeople_select_all_contacts", $rootel);
        var addpeopleCheckbox = ".addpeople_checkbox";
        var addpeopleSelectedCheckbox = ".addpeople_selected_checkbox";
        var addpeopleSelectedPermissions = ".addpeople_selected_permissions";
        var $addpeopleSelectedAllPermissions = $("#addpeople_selected_all_permissions", $rootel);
        var $addpeopleSelectAllSelectedContacts = $("#addpeople_select_all_selected_contacts", $rootel);
        var $addpeopleFinishAdding = $(".addpeople_finish_adding", $rootel);
        var $addpeopleRemoveSelected = $(".addpeople_remove_selected", $rootel);
        var $addpeopleMembersAutoSuggestField = $("#addpeople_members_autosuggest_field", $rootel);
        var $addpeopleExistingGroup = $(".addpeople_existinggroup", $rootel);
        var $addpeopleNewGroup = $(".addpeople_newgroup", $rootel);

        var selectedUsers = {};
        var currentTemplate = false;
        var hasbeenInit = false;
        var existingGroup = false;


        ///////////////
        // RENDERING //
        ///////////////

        var renderContacts = function(){
            if ($addpeopleContactsContainer.text() === "") {
                var groups = sakai.api.Groups.getMemberships(sakai.data.me.groups);
                groups = groups.entry;
                if (sakai_global.group && sakai_global.group.groupData && sakai_global.group.groupData["sakai:group-id"]) {
                    groups = _.reject(groups, function(group) {
                        return group["sakai:group-id"] === sakai_global.group.groupData["sakai:group-id"];
                    });
                }
                $addpeopleContactsContainer.html(sakai.api.Util.TemplateRenderer(addpeopleContactsTemplate, {
                    "contacts": sakai.data.me.mycontacts,
                    "groups": groups,
                    "sakai": sakai
                }));
            }
        };

        var renderSelectedContacts = function(){
            $addpeopleSelectedContactsContainer.html(sakai.api.Util.TemplateRenderer(addpeopleSelectedContactsTemplate, {
                "contacts":selectedUsers,
                "roles": currentTemplate.roles,
                "sakai": sakai
            }));
            enableDisableControls(true);
        };


        /////////////
        // UTILITY //
        /////////////

        var enableDisableControls = function(disable){
            if(disable){
                $addpeopleRemoveSelected.attr("disabled","disabled");
                $addpeopleSelectedAllPermissions.attr("disabled","disabled");
            }else{
                $addpeopleRemoveSelected.removeAttr("disabled");
                $addpeopleSelectedAllPermissions.removeAttr("disabled");
            }
        };

        var decideEnableDisableControls = function(el){
            if($("." + el.currentTarget.className + ":checked").length){
                enableDisableControls(false);
            }else{
                enableDisableControls(true);
            }
            $addpeopleSelectAllSelectedContacts.removeAttr("checked");
        };

        /**
         * Generates an error message that lists the available management roles
         * that the group needs at least one user to be in
         * @return {String} errorMsg A string containing the error message
         */
        var generateExistingGroupError = function(){
            var roles = $.parseJSON(sakai_global.group.groupData["sakai:roles"]);
            var manageRoles = [];
            for (var i in roles){
                if (roles.hasOwnProperty(i) && roles[i].allowManage === true){
                    var key = roles[i].title.substr(7, roles[i].title.length - 9);
                    manageRoles.push(sakai.api.i18n.getValueForKey(key));
                }
            }
            var manageRoleSelections = false;
            var doubleQuote = sakai.api.i18n.getValueForKey("DOUBLE_QUOTE");
            if (manageRoles.length > 1) {
                for (var m in manageRoles) {
                    if (manageRoles.hasOwnProperty(m)){
                        if (!manageRoleSelections){
                            manageRoleSelections = doubleQuote + manageRoles[m] + doubleQuote;
                        } else if ((parseInt(m, 10) + 1) === manageRoles.length){
                            manageRoleSelections = manageRoleSelections + " " + sakai.api.i18n.getValueForKey("OR") + " " + doubleQuote + manageRoles[m] + doubleQuote;
                        } else {
                            manageRoleSelections = manageRoleSelections + ", " + doubleQuote + manageRoles[m] + doubleQuote;
                        }
                    }
                }
            } else {
                manageRoleSelections = doubleQuote + manageRoles[0] + doubleQuote;
            }
            errorMsg = sakai.api.i18n.getValueForKey("THIS_GROUP_MUST_HAVE_AT_LEAST_ONE_MANAGER", "addpeople");
            errorMsg = errorMsg.replace("${groupType}", sakai.api.i18n.getValueForKey(currentTemplate.title.substr(7, currentTemplate.title.length - 9)));
            errorMsg = errorMsg.replace("${managerRole}", manageRoleSelections);
            return errorMsg;
        };

        /**
         * Fire an event that indicates the addpeople widget is done adding users.
         * The object containing this userdata is giving to the event
         * Also hide the overlay
         */
        var finishAdding = function(){
            var managerSelected = false;
            var permissionsToChange = [];
            var newUsers = [];
            $.each(selectedUsers, function(index, user){
                if (user.originalPermission && user.permission !== user.originalPermission) {
                    permissionsToChange.push(user);
                }

                if (!user.originalPermission){
                    newUsers.push(user);
                }

                $.each(currentTemplate.roles, function(i, role){
                    if (user.permission == role.title || user.permission == role.id) {
                        user.permission = role.id;
                        user.permissionTitle = role.title;
                        if (role.allowManage) {
                            managerSelected = true;
                        }
                    }
                });
            });
            if (managerSelected || !sakai_global.group) {
                // This is called after toadd.addpeople.sakai completes
                $(window).unbind("usersselected.addpeople.sakai").bind("usersselected.addpeople.sakai", function(e) {
                    if (permissionsToChange.length) {
                        $(window).trigger("usersswitchedpermission.addpeople.sakai", [tuid.replace("addpeople", ""), permissionsToChange]);
                    }
                });
                $(window).trigger("toadd.addpeople.sakai", [tuid.replace("addpeople", ""), newUsers]);
                if (sakai_global.group) {
                    $.each(newUsers, function(index, user){
                        var groupTitle = sakai.api.Security.safeOutput(sakai_global.group.groupData["sakai:group-title"]);
                        var groupID = sakai_global.group.groupData["sakai:group-id"];
                        var displayName = sakai.api.User.getDisplayName(sakai.data.me.profile);
                        var subject = sakai.api.i18n.getValueForKey("USER_HAS_ADDED_YOU_AS_A_ROLE_TO_THE_GROUP_GROUPNAME", "addpeople").replace("${user}", displayName).replace("${role}", sakai.api.i18n.General.process(user.permissionTitle)).replace("${groupName}", groupTitle);
                        var body = $("#addpeople_message_template", $rootel).text().replace("${role}", sakai.api.i18n.General.process(user.permissionTitle)).replace("${firstname}", user.name).replace("${user}", sakai.api.User.getDisplayName(sakai.data.me.profile)).replace("${groupURL}", sakai.config.SakaiDomain + "/~" + groupID).replace("${groupName}", groupTitle);
                        sakai.api.Communication.sendMessage(user.userid, sakai.data.me, subject, body, "message", false, false, true, "group_invitation");
                    });
                    if (permissionsToChange.length || newUsers.length) {
                        sakai.api.Util.notification.show(sakai.api.i18n.getValueForKey("MANAGE_PARTICIPANTS", "addpeople"), sakai.api.i18n.getValueForKey("NEW_SETTINGS_HAVE_BEEN_APPLIED", "addpeople"));
                    }
                }
                $addpeopleContainer.jqmHide();
            } else {
                var errorMsg = sakai.api.i18n.getValueForKey("SELECT_AT_LEAST_ONE_MANAGER", "addpeople");
                if (existingGroup && sakai_global.group){
                    errorMsg = generateExistingGroupError();
                }
                sakai.api.Util.notification.show(sakai.api.i18n.getValueForKey("MANAGE_PARTICIPANTS", "addpeople"), errorMsg);
            }
        };

        /**
         * Check/Uncheck all items in the list and enable/disable buttons
         */
        var checkAll = function(el, peopleContainer){
            if($(el).is(":checked")){
                $(peopleContainer).attr("checked","checked");
                if (peopleContainer !== addpeopleSelectedCheckbox) {
                    $(peopleContainer).change();
                    renderSelectedContacts();
                }else{
                    enableDisableControls(false);
                }
            }else{
                $(peopleContainer).removeAttr("checked");
                if (peopleContainer !== addpeopleSelectedCheckbox) {
                    $(peopleContainer).removeAttr("checked");
                    $(peopleContainer).change();
                    renderSelectedContacts();
                    $addpeopleSelectAllSelectedContacts.removeAttr("checked");
                } else {
                    enableDisableControls(true);
                }
            }
        };

        /**
         * Construct a user object when adding a user to the list of selected users
         */
        var constructSelecteduser = function(){
            $addpeopleSelectAllSelectedContacts.removeAttr("checked");
            if ($(this).is(":checked")) {
                if (!selectedUsers[$(this)[0].id.split("_")[0]]) {
                    var userObj = {
                        userid: $(this)[0].id.split("_")[0],
                        roleid: $(this).val(),
                        name: $(this).nextAll(".s3d-entity-displayname").text(),
                        dottedname: sakai.api.Util.applyThreeDots($(this).nextAll(".s3d-entity-displayname").text(), 100, null, "s3d-entity-displayname s3d-regular-links s3d-bold"),
                        permission: currentTemplate.joinRole,
                        picture: $(this).next().children("img").attr("src"),
                        tmpsrc:"checklistadded"
                    };
                    selectedUsers[userObj.userid] = userObj;
                    renderSelectedContacts();
                }
            }else{
                delete selectedUsers[$(this)[0].id.split("_")[0]];
                renderSelectedContacts();
                $addpeopleSelectAllSelectedContacts.removeAttr("checked");
                $addpeopleSelectAllContacts.removeAttr("checked");
            }
        };

        /**
         * Batch change the permission setting for a specific selection of users
         */
        var changeSelectedPermission = function(){
            var selectedPermission = $(this).val();
            var selectedPermissionTitle = $(this).find("option:selected").text();
            $.each($addpeopleSelectedContactsContainer.find("input:checked"), function(index, item){
                $(item).nextAll("select").val(selectedPermission);
                selectedUsers[$(item)[0].id.split("_")[0]].permission = selectedPermission;
                selectedUsers[$(item)[0].id.split("_")[0]].permissionTitle = selectedPermissionTitle;
            });
        };

        /**
         * Change the permission setting for a specific user
         */
        var changePermission = function(){
            var userid = $(this)[0].id.split("_")[0];
            selectedUsers[userid].permission = $(this).val();
            selectedUsers[userid].permissionTitle = $(this).find("option:selected").text();
        };

        /**
         * Removes all users that are selected from the list of users to be added as a member (manager or viewer)
         */
        var removeSelected = function(){
            var managerLeft = false;
            $.each($addpeopleSelectedContactsContainer.find("input:not(:checked)"), function(index, user){
                $.each(currentTemplate.roles, function(i, role){
                    if (role.allowManage) {
                        if ($(user).nextAll("select").val() == role.id) {
                            managerLeft = true;
                        }
                    }
                });
            });
            if (managerLeft || !sakai_global.group) {
                var usersToDelete = [];
                $.each($addpeopleSelectedContactsContainer.find("input:checked"), function(index, item){
                    usersToDelete.push({
                        "userid": $(item)[0].id.split("_")[0],
                        "permission": $(item).nextAll("select").val()
                    });
                    delete selectedUsers[$(item)[0].id.split("_")[0]];
                    $("#" + $(item)[0].id.split("_")[0] + "_chk").removeAttr("checked");
                    $addpeopleSelectAllContacts.removeAttr("checked");
                    $(item).parent().next().remove();
                    $(item).parent().remove();
                });
                if (sakai_global.group) {
                    sakai.api.Groups.removeUsersFromGroup(sakai_global.group.groupData["sakai:group-id"], usersToDelete, sakai.data.me);
                }
                $addpeopleSelectAllSelectedContacts.removeAttr("checked");
            } else {
                var errorMsg = sakai.api.i18n.getValueForKey("SELECT_AT_LEAST_ONE_MANAGER", "addpeople");
                if (existingGroup && sakai_global.group){
                    errorMsg = generateExistingGroupError();
                }
                sakai.api.Util.notification.show(sakai.api.i18n.getValueForKey("MANAGE_PARTICIPANTS", "addpeople"), errorMsg);
            }
        };


        ////////////////////
        // INITIALIZATION //
        ////////////////////

        /**
         * Get the list of selected users/groups from the autosuggest plugin
         * @return {Object} returnValue An object containing a list of displayNames and an Array of userID's to be added to the members list
         */
        var createAutoSuggestedUser = function(userData) {
            var pictureURL = userData.attributes.picture;
            var userid = userData.attributes.value;
            var userObj = {
                userid: userid,
                name: userData.attributes.name,
                dottedname: sakai.api.Util.applyThreeDots(userData.attributes.name, 100, null, "s3d-entity-displayname s3d-regular-links s3d-bold", true),
                permission: currentTemplate.joinRole,
                picture: pictureURL,
                tmpsrc:"autsuggestadded"
            };
            selectedUsers[userObj.userid] = userObj;
            renderSelectedContacts();
            $(".as-close").click();
        };


        /**
         * Clears the input field, closes the autosuggest and then hides the modal/overlay, called onHide in jqm
         */
        var resetAutosuggest = function(h){
            sakai.api.Util.AutoSuggest.reset($addpeopleMembersAutoSuggestField);
            $("ul",$addpeopleSelectedContactsContainer).empty();
            $(addpeopleCheckbox).add($addpeopleSelectAllContacts).removeAttr("checked");
            h.w.hide();
            if (h.o) {
                h.o.remove();
            }
        };

        var prepareSelectedContacts = function(success, data){
            for(var role in data){
                for(var user in data[role].results){
                    if (data[role].results.hasOwnProperty(user)) {
                        var userObj = {};
                        if (data[role].results[user].hasOwnProperty("sakai:group-id")) {
                            userObj = {
                                userid: data[role].results[user]["sakai:group-id"],
                                name: data[role].results[user]["sakai:group-title"],
                                dottedname: sakai.api.Util.applyThreeDots(data[role].results[user]["sakai:group-title"], 100, null, "s3d-entity-displayname s3d-regular-links s3d-bold", true)
                            };
                        } else {
                            userObj = {
                                userid: data[role].results[user]["rep:userId"],
                                name: sakai.api.User.getDisplayName(data[role].results[user]),
                                dottedname: sakai.api.Util.applyThreeDots(sakai.api.User.getDisplayName(data[role].results[user]), 100, null, "s3d-entity-displayname s3d-regular-links s3d-bold", true)
                            };
                        }

                        $.each(currentTemplate.roles, function(i, r){
                            if (currentTemplate.roles[i].title === role) {
                                userObj.permission = currentTemplate.roles[i].id;
                                userObj.originalPermission = currentTemplate.roles[i].id;
                                userObj.permissionTitle = role;
                            }
                        });
                        if (data[role].results[user]["sakai:group-id"]) {
                            userObj.picture = sakai.api.Groups.getProfilePicture(data[role].results[user]);
                        } else {
                            userObj.picture = sakai.api.User.getProfilePicture(data[role].results[user]);
                        }
                        selectedUsers[userObj.userid] = userObj;
                    }
                }
            }
            renderSelectedContacts();
        };

        var fetchMembers = function(){
            sakai.api.Groups.getMembers(sakai_global.group.groupData["sakai:group-id"], "", prepareSelectedContacts, true);
        };

        /**
         * Initialize the modal dialog
         */
        var initializeJQM = function(){
            $addpeopleContainer.jqm({
                modal: true,
                overlay: 20,
                toTop: true,
                onHide: resetAutosuggest
            });
        };

        var showDialog = function(){
            $addpeopleContainer.jqmShow();
        };

        var addBinding = function(){
            // Unbind all
            $addpeopleFinishAdding.unbind("click", finishAdding);
            $addpeopleRemoveSelected.unbind("click", removeSelected);

            // Bind all
            $addpeopleSelectAllContacts.bind("click", function(){
                checkAll(this, addpeopleCheckbox);
            });
            $addpeopleSelectAllSelectedContacts.bind("click", function(){
                checkAll(this, addpeopleSelectedCheckbox);
            });
            $(addpeopleSelectedCheckbox).live("change", decideEnableDisableControls);
            $addpeopleSelectedAllPermissions.bind("change", changeSelectedPermission);
            $(addpeopleCheckbox).die("change").live("change", constructSelecteduser);
            $(addpeopleSelectedPermissions).die("change").live("change", changePermission);
            $addpeopleFinishAdding.bind("click", finishAdding);
            $addpeopleRemoveSelected.bind("click", removeSelected);
        };

        var loadRoles = function(){
            currentTemplate = sakai.api.Groups.getTemplate(widgetData.category, widgetData.id);
            $("#addpeople_selected_all_permissions", $rootel).html(sakai.api.Util.TemplateRenderer("addpeople_selected_permissions_template", {"roles": currentTemplate.roles,"sakai": sakai}));
        };

        var fetchGroupsAndUsersData = function(defaultMembers){
            var batchRequests = [];

            $.each(defaultMembers, function(i, member){
                batchRequests.push({
                    "url": "/~" + member + "/public/authprofile.profile.json",
                    "method": "GET",
                    "parameters": {}
                });
            });

            sakai.api.Server.batch(batchRequests, function(success, data) {
                if (success) {
                    $.each(data.results, function(i, result){
                        result = $.parseJSON(result.body);
                        var picture = "";
                        if (result && result.picture){
                            picture = "/~" + sakai.api.Util.safeURL(result.userid || result["sakai:group-id"]) + "/public/profile/" + sakai.api.Util.safeURL($.parseJSON(result.picture).name);
                        } else {
                            if(result.userid){
                                picture = sakai.api.User.getProfilePicture(result);
                            }else{
                                picture = sakai.api.Groups.getProfilePicture(result);
                            }
                        }
                        var name = "";
                        var dottedname = "";
                        if(result["sakai:group-title"]){
                            name = result["sakai:group-title"];
                            dottedname = sakai.api.Util.applyThreeDots(name, 100, null, "s3d-entity-displayname s3d-regular-links s3d-bold", true)
                        } else {
                            name = sakai.api.User.getDisplayName(result);
                            dottedname = sakai.api.Util.applyThreeDots(name, 100, null, "s3d-entity-displayname s3d-regular-links s3d-bold", true)
                        }
                        var userObj = {
                            userid: result.userid || result["sakai:group-id"],
                            name: name,
                            dottedname: dottedname,
                            permission: currentTemplate.joinRole,
                            picture: picture
                        };
                        selectedUsers[userObj.userid] = userObj;
                    });
                    renderSelectedContacts();
                    $(window).trigger("toadd.addpeople.sakai", [tuid.replace("addpeople", ""), selectedUsers]);
                }
            });
        };

        ////////////
        // EVENTS //
        ////////////

        $(window).bind("init.addpeople.sakai", function(e, initTuid, editingGroup){
            if (initTuid + "addpeople" === tuid || sakai_global.group) {
                existingGroup = editingGroup;
                if (!hasbeenInit) {
                    if (!widgetData) {
                        widgetData = {
                            "category": sakai_global.group.groupData["sakai:category"],
                            "id": sakai_global.group.groupData["sakai:templateid"]
                        };
                    }
                    loadRoles();
                    addBinding();
                    sakai.api.Util.AutoSuggest.setup($addpeopleMembersAutoSuggestField, {"asHtmlID": tuid,"resultClick":createAutoSuggestedUser},function(){$addpeopleMembersAutoSuggest.show();});
                    initializeJQM();
                    hasbeenInit = true;
                } else {
                    renderSelectedContacts();
                }
                if(sakai_global.group){
                    fetchMembers();
                }
                if(existingGroup){
                    $addpeopleNewGroup.hide();
                    $addpeopleExistingGroup.show();
                }
                showDialog();
                sakai.api.User.getContacts(renderContacts);
            }
        });
    };

    if(!hasbeenInit){
        loadRoles();
        var defaultMembers = $.bbq.getState("members") || [];
        if(defaultMembers.length){
            defaultMembers = defaultMembers.split(",");
            fetchGroupsAndUsersData(defaultMembers);
        }
    }

    sakai.api.Widgets.widgetLoader.informOnLoad("addpeople");

});
