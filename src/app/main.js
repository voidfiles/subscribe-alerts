define(["jquery"], function($) {
  var accessToken = localStorage.accessToken;
  var channelId = localStorage.channelId;

  if (!channelId) {
    chrome.pushMessaging.getChannelId(true, function (userChannelObj) {
      localStorage.channelId = channelId = userChannelObj.channelId;
    });
  }

  if (!accessToken) {
    chrome.tabs.create({url: "chrome-extension://cfeahloocnncpelfiekbodlmlojfoapi/options.html", active: true, selected: true}, function (tab) {
      chrome.windows.update(tab.windowId, {focused: true});
    });
  }

  var UrlOpener = function (url) {
    this.url = url;
  };

  UrlOpener.prototype.open = function () {
    var url = this.url;
    chrome.tabs.query({url: url}, function (tabs) {
      if (tabs.length) {
        $.each(tabs, function (tab) {
          if (tab.url === url) {
            chrome.tabs.update(tab.id, {active: true, selected: true});
            chrome.windows.focused(tab.windowId, {focused: true});
          }
        });
      } else {
        chrome.tabs.create({url: url, active: true, selected: true}, function (tab) {
          chrome.windows.update(tab.windowId, {focused: true});
        });
      }
    });
  };



  function handlePushMessage(message) {
    console.log("Handling message", message);
    var payload = JSON.parse(message.payload);
    var p1 = $.ajax({
      url: 'https://alpha-api.app.net/stream/0/channels/' + payload.channel_id + '/messages/' + payload.id,
      data: {
        include_annotations: 1
      },
      headers: {
        'Authorization': 'Bearer ' + localStorage.accessToken,
      }
    });

    var p2 = $.ajax({
      url: 'https://alpha-api.app.net/stream/0/channels/' + payload.channel_id,
      data: {
        include_annotations: 1
      },
      headers: {
        'Authorization': 'Bearer ' + localStorage.accessToken,
      }
    });

    $.when(p1, p2).done(function (a1, a2) {
      var message = a1[0];
      var channel = a2[0];
      var title = 'New Message';
      var fallback_url;
      if (channel.data.annotations) {
        $.each(channel.data.annotations, function (key, annotation) {
          if (annotation.type === 'net.app.core.broadcast.metadata') {
            if (annotation.value.title) {
              title = annotation.value.title;
            }
            if (annotation.value.fallback_url) {
              fallback_url = annotation.value.fallback_url;
            }
          }
        });
      }

      var notification = webkitNotifications.createNotification(message.data.user.avatar_image.url,
        title,
        message.data.text
      );
      var link = (message.data.entities.links[0] && message.data.entities.links[0].url);
      if (message.data.annotations) {
        $.each(message.data.annotations, function (annotation) {
          if (annotation.type === 'net.app.core.crosspost') {
            link = annotation.value.canonical_url;
          }
        });
      }
      link = link || fallback_url;
      if (link) {
        var opener = new UrlOpener(link);
        notification.onclick = $.proxy(opener.open, opener);
      }

      notification.show();
    });
        
  };

  chrome.pushMessaging.onMessage.addListener(function (message) {
    if (message.payload === 'testing') {
      message = {payload: '{"channel_id": "25296", "id": "1388505"}'};
    }
    handlePushMessage(message);
  });
  
});
