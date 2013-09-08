define(["jquery", "purl"], function($, purl) {
    console.log(window.location.href);
    var accessToken = purl(window.location.href).fparam('access_token');
    if (accessToken) {
        chrome.pushMessaging.getChannelId(true, function (userChannelObj) {
          console.log('settings channelId', userChannelObj.channelId);
          localStorage.channelId = channelId = userChannelObj.channelId;
          $.ajax({
            type: 'POST',
            url: "https://guarded-harbor-8330.herokuapp.com/notifications/user/channel",
            data: {
              channel_id: channelId
            },
            headers: {
              'Authorization': 'Bearer ' + localStorage.accessToken
            }
          });
        });

    } else {
      accessToken = localStorage.accessToken;
    }

    if (accessToken) {
      localStorage.accessToken = accessToken;
      $('[data-authorize]').hide();
      $('p').show();
    }

    $('[data-manual-push]').on('click', function () {
      $.ajax({
        type: "POST",
        url: "https://guarded-harbor-8330.herokuapp.com/notifications/user/message",
        data: {
          message: 'testing'
        },
        headers: {
          'Authorization': 'Bearer ' + localStorage.accessToken
        }
      });
      return false;
    });
});