---
---

/* 首页站内搜索。
   搜索框现在常驻可见（见 index.html 的 .home-search），所以不再有原来的展开/折叠逻辑。
   只有首页有搜索框，但本脚本在每一页都会加载，所以先判断元素存在再继续。

   两个和这个库有关的坑：
   - SimpleJekyllSearch 1.7.4 只监听 keyup。中文输入法用鼠标点候选词提交时，浏览器
     只发 input、不发 keyup，会漏掉最后一次搜索，所以这里补一个 input 监听。
   - 它的 success 回调会在构造函数返回之前同步触发，那时候拿不到实例，
     所以 ?q= 深链不能直接调 sjs.search()，改成往搜索框派发 keyup，让库自己去查。
     ?q= 是结构化数据里 SearchAction 的落地参数（见 _includes/schemas/website.html）。 */
window.addEventListener('load', function () {
    var $searchbar = document.getElementById('searchbar');
    var $searchResults = document.getElementById('search-results');

    if (!$searchbar || !$searchResults) {
        return;
    }

    var showResults = function (visible) {
        $searchResults.style.display = visible ? 'block' : 'none';
    };

    var sjs = SimpleJekyllSearch({
        searchInput: $searchbar,
        resultsContainer: $searchResults,
        json: '{{ "/search.json" | relative_url }}',
        searchResultTemplate: '<a href="{url}">{title}</a>',
        noResultsText: ''
    });

    var pendingQuery = new URLSearchParams(window.location.search).get('q');

    var applyPendingQuery = function (tries) {
        if (!pendingQuery) {
            return;
        }
        $searchbar.value = pendingQuery;
        $searchbar.dispatchEvent(new Event('keyup', { bubbles: true }));
        showResults(true);

        /* 索引还没加载完时结果为空，隔一段时间重试，直到出结果或达到次数上限 */
        if ($searchResults.textContent.trim() === '' && tries < 12) {
            window.setTimeout(function () { applyPendingQuery(tries + 1); }, 250);
        }
    };

    applyPendingQuery(0);

    $searchbar.addEventListener('focus', function () {
        showResults(true);
    });

    $searchbar.addEventListener('input', function () {
        if ($searchbar.value.trim() === '') {
            $searchResults.innerHTML = '';
            showResults(false);
            return;
        }
        sjs.search($searchbar.value);
        showResults(true);
    });

    $searchbar.addEventListener('keydown', function (e) {
        if (e.key === 'Escape') {
            showResults(false);
            $searchbar.blur();
        }
    });

    /* 点击搜索框之外收起结果 */
    document.addEventListener('click', function (e) {
        if (!e.target.closest || !e.target.closest('.search-container')) {
            showResults(false);
        }
    });
});
