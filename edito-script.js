var ARTICLES_DB = '363011abd129806abe22d688affef423';

async function loadEdito() {
  var grid = document.getElementById('edito-grid');
  if (!grid) return;
  try {
    var res = await fetch('/.netlify/functions/notion?db=' + ARTICLES_DB);
    var data = await res.json();
    if (!data.results || data.results.length === 0) { grid.innerHTML = ''; return; }
    var articles = data.results.slice(0, 4);
    var html = '';
    articles.forEach(function(item, i) {
      var props = item.properties;
      var titre = props.Titre && props.Titre.title && props.Titre.title[0] ? props.Titre.title[0].plain_text : 'Sans titre';
      var desc = props.Description && props.Description.rich_text && props.Description.rich_text[0] ? props.Description.rich_text[0].plain_text.substring(0, 120) + '...' : '';
      var tag = props.Tag && props.Tag.rich_text && props.Tag.rich_text[0] ? props.Tag.rich_text[0].plain_text : 'Article';
      var image = props.Image && props.Image.url ? props.Image.url : 'https://picsum.photos/seed/' + item.id.slice(0,8) + '/700/400';
      var url = '/article.html?id=' + item.id.replace(/-/g,'');
      if (i === 0) {
        html += '<a href="' + url + '" class="edito-main" style="text-decoration:none">' +
          '<img class="edito-main-img" src="' + image + '" alt="' + titre + '" onerror="this.src=\'https://picsum.photos/seed/edito/700/400\'">' +
          '<div class="edito-main-overlay"></div>' +
          '<div class="edito-main-body">' +
          '<div class="edito-card-tag" style="margin-bottom:10px">' + tag + '</div>' +
          '<div class="edito-quote" style="font-style:normal;font-size:20px">' + titre + '</div>' +
          (desc ? '<div class="edito-author" style="margin-top:8px;font-size:13px">' + desc + '</div>' : '') +
          '</div></a>';
      } else {
        html += '<a href="' + url + '" class="edito-card" style="text-decoration:none">' +
          '<div class="edito-card-tag">' + tag + '</div>' +
          '<div class="edito-card-title">' + titre + '</div>' +
          (desc ? '<div class="edito-card-desc">' + desc + '</div>' : '') +
          '</a>';
      }
    });
    grid.innerHTML = html;
  } catch(e) {
    console.error('Edito error:', e);
    grid.innerHTML = '';
  }
}

loadEdito();
