(function () {

    var self = this;

    return {
        events: {
            'app.activated': 'initialize',
            'click .saveEmails': 'saveEmails',
            'ticket.submit.done': 'cleanUp'
        },

        requests: {
            createTarget: function (payload) {
                return {
                    url: '/api/v2/targets.json',
                    type: 'POST',
                    contentType: 'application/json',
                    data: payload
                };
            },

            createTrigger: function (payload) {
                return {
                    url: '/api/v2/triggers.json',
                    type: 'POST',
                    contentType: 'application/json',
                    data: payload
                };
            },

            deleteTarget: function (targetID) {
                return {
                    url: '/api/v2/targets/' + targetID + '.json',
                    type: 'DELETE',
                    contentType: 'application/json'
                };
            },

            deleteTrigger: function (triggerID) {
                return {
                    url: '/api/v2/triggers/' + triggerID + '.json',
                    type: 'DELETE',
                    contentType: 'application/json'
                };
            }
        },

        initialize: function () {
            this.switchTo("main");
            self.ticketID = this.ticket().id();
        },

        tagTicket: function () {
            this.ticket().tags().add("zcc_" + self.ticketID);
        },

        getEmailList: function () {
            var emails = this.$("textarea[name=emailList]")[0].value;
            var emailList = emails.split(",");
            var validateEmail = function (email) {
                    var re = /^([\w-]+(?:\.[\w-]+)*(?:\+[\w-]+)*)@((?:[\w-]+\.)*\w[\w-]{0,66})\.([a-z]{2,6}(?:\.[a-z]{2})?)$/i;
                    return re.test(email);
                }
                ;

            try {
                for (var i = 0; i < emailList.length; i++) {
                    emailList[i] = emailList[i].trim();

                    if (!validateEmail(emailList[i])) {
                        throw this.I18n.t('notifications.invalid') + emailList[i];
                    }
                }
                return emailList;
            } catch (err) {
                services.notify(err, 'error');
            }
        },

        saveEmails: function () {
            self.targetID = [];
            var emailList = this.getEmailList();
            var length = emailList.length;
            self.commentsType = '{{' + this.$('input[name="ticketComments"]:checked').val() + '}}';
            this.tagTicket();

            // Build Targets
            _.each(emailList, function (email) {
                var targetPayload = '{"target": {"type": "email_target", "title": "' + this.I18n.t('content.target-title') + email + '", "email": "' + email + '", "subject": "[{{ticket.account}}] ' + this.I18n.t('content.email-subject') + ' {{ticket.title}}"}';
                this.ajax('createTarget', targetPayload).done(function (targetData) {
                    self.targetID.push(targetData.target.id);
                    if (self.targetID.length === emailList.length) {
                        this.buildTrigger();
                        services.notify(this.I18n.t('fetch.done'));
                    }
                }).fail(function (data) {
                    services.notify(this.I18n.t('fetch.fail'));
                });
            }, this);
        },

        buildTrigger: function () {
            self.actions = '"actions": [';
            _.each(self.targetID, function (targetID) {
                self.actions = self.actions + '{"field": "notification_target", "value": [' + targetID + ', "' + this.I18n.t('content.email-notification') + ' </br> ' + self.commentsType + '"]},';
            }, this);

            self.actions = self.actions.substring(0, self.actions.length - 1);
            var triggerPayload = '{"trigger": {"title": "' + this.I18n.t('content.trigger-title') + self.ticketID + '", "all": [{ "field": "current_tags", "operator": "includes", "value": "zcc_' + self.ticketID + '"}], ' + self.actions + ']}}';

            this.ajax('createTrigger', triggerPayload).done(function (triggerData) {
                self.triggerID = triggerData.trigger.id;
            });
        },

        getUserChoice: function () {
            var selectedRadio;

            this.$("input[name=TicketComments]").each(function (index, target) {
                if (target.checked) {
                    selectedRadio = target.value;
                }
            });

            return selectedRadio;
        },

        cleanUp: function () {
            var that = this;

            setTimeout(function () {
                that.ajax('deleteTrigger', self.triggerID);
            }, 3000);
            _.each(self.targetID, function (targetID) {
                setTimeout(function () {
                    that.ajax('deleteTarget', targetID).done(function (data) {
                    });
                }, 3000);
            }, this);
        }
    };

}());
