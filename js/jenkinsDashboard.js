/*jslint browser:true, sloppy: true, plusplus: true */
/*globals $: false, config: false */

var dashboardLastUpdatedTime = new Date(),
    sounds = [],
    soundQueue = {
        add: function (sound_url) {
            sounds.push(sound_url);
        },
        play: function () {
            if (sounds.length > 0) {
                var soundPlayer = $("#sound")[0];
                if (soundPlayer.paused) {
                    soundPlayer.src = sounds.shift();
                    soundPlayer.play();
                }
            }
        }
    };

var jenkinsDashboard = {
    addTimestampToBuild : function (elements) {
        elements.each(function () {
            var worker = $(this).attr("class"),
                y = parseInt($(this).offset().top + $(this).height() / 2),
                x = parseInt($(this).offset().left + $(this).width() / 2),
                id = x + "-" + y,
                html = '<div class="job_disabled_or_aborted" id="' + id + '">' + worker + '</div>',
                new_element;
            $("#content").append(html);
            new_element = $("#" + id);
            new_element.css("top", parseInt(y - new_element.height() / 2)).css("left", parseInt(x - new_element.width() / 2));
            new_element.addClass('rotate');
            $(this).addClass('workon');
        });
    },
    composeHtmlFragement: function (jobs) {
        var fragment = "<section>";

        $.each(jobs, function () {
            fragment += ("<article class=" + this.color + "><head>" + this.name + "</head></article>");
        });
        dashboardLastUpdatedTime = new Date();
        fragment += "<article class='time'>" + dashboardLastUpdatedTime.toString('dd, MMMM ,yyyy')  + "</article></section>";
        $("#content").html(fragment);
    },
    updateBuildStatus : function (data) {
        jenkinsDashboard.composeHtmlFragement(data.jobs);
        jenkinsDashboard.addTimestampToBuild($(".disabled, .aborted"));
    }
};


function matchInArray(string, expressions) {

    var len = expressions.length,
        i = 0;

    for (; i < len; i++) {
        if (string.match(expressions[i])) {
            return true;
        }
    }

    return false;

};

function processData(data) {

    var jobs_to_be_filtered = config.jobs_to_be_filtered,
        jobs_to_be_excluded = config.jobs_to_be_excluded;


    var processedJobs = jQuery.grep(data.jobs, function(n, i) {

        if ((jobs_to_be_filtered.length === 0 || matchInArray(data.jobs[i].name, jobs_to_be_filtered) === true) && (matchInArray(data.jobs[i].name, jobs_to_be_excluded) === false) && (data.jobs[i].color!=="disabled" )) {
            data.jobs[i].name = data.jobs[i].name.replace(config.remove_string_in_name,"");

            if (config.replace_in_name) {
                for (var s = 0; s < config.replace_in_name.length; s++) {
                    data.jobs[i].name = data.jobs[i].name.replace(config.replace_in_name[s]["key"],config.replace_in_name[s]["value"]);
                }
            }

            return true;
        }
        return false;
    });

    data.jobs = processedJobs;

    return data;
}

function soundForCI(data, lastData) {


    if (lastData !== null) {
        $(data.jobs).each(function (index) {
            if (lastData.jobs[index] !== undefined) {
                //console.log("Build failed - last job: name: " + lastData.jobs[index].name + " color: " + lastData.jobs[index].color + ", job: name: " + this.name + ", color: " + this.color);
                if (lastData.jobs[index].color === 'blue_anime' && this.color === 'red') {
                    //console.log("Build failed - last job: name: " + lastData.jobs[index].name + " color: " + lastData.jobs[index].color + ", job: name: " + this.name + ", color: " + this.color);
                    soundQueue.add('http://translate.google.com/translate_tts?q=build+' + this.name + '+failed&tl=en');
                }
                if (lastData.jobs[index].color === 'red_anime' && this.color === 'blue') {
                    //console.log("Build was successfull - last job: name: " + lastData.jobs[index].name + " color: " + lastData.jobs[index].color + ", job: name: " + this.name + ", color: " + this.color);
                    soundQueue.add('sounds/nsmb_power-up.mp3');
                }
            }
        });
    }

    return data;
}

$(document).ready(function () {

    var ci_url = config.ci_url + "/api/json",
        counter = 0,
        lastData = null,
        auto_refresh = setInterval(function () {
            counter++;
            $.jsonp({
                url: ci_url + "?format=json&jsonp=?",
                dataType: "jsonp",
                // callbackParameter: "jsonp",
                timeout: 10000,
                beforeSend: function (xhr) {
                    if (counter === 1) {
                        $.blockUI({
                            message: '<h1 id="loading"><img src="img/busy.gif" />loading.....</h1>'
                        });
                    }
                },
                success: function (data, status) {
                    $.unblockUI();
                    data = processData(data);
                    lastData = soundForCI(data, lastData);
                    jenkinsDashboard.updateBuildStatus(data);
                },
                error: function (XHR, textStatus, errorThrown) {
                    if ($("#error_loading").length <= 0) {
                        $.blockUI({
                            message: '<h1 id="error_loading"> Ooooops, check out your network etc. Retrying........</h1>'
                        });
                    }
                }
            });
            console.log("Sounds before play: " + sounds.length);
            soundQueue.play();
            console.log("Sounds after play: " + sounds.length);
        }, 4000);

});