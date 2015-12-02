var request = require('request')
  , cheerio = require('cheerio')
  , BloomFilter = require('bloomfilter').BloomFilter
  , _SPACE = 32 * 1024 * 1024
  , _BLOOM = new BloomFilter(_SPACE, 16)
  , _URL = process.argv[2] || 'http://computer.hdu.edu.cn'
  , _LEVEL = process.argv[3] || 1
  , _PROTOCOL = new RegExp('^https').test(_URL) ? 'https:' : 'http:'
  , mongoose = require('mongoose')
  , db = mongoose.createConnection('mongodb://127.0.0.1:27017/tinyworm')
  , schema = new mongoose.Schema({url:{type: String},body:{type: String}})
  , model = db.model(_URL+' '+new Date().toString(), schema)
  , prefixUrl = url => {
    if (new RegExp(/^http(s)?:\/{2}.+/).test(url)) {return url;}
    else if (new RegExp(/^\/{2}.+/).test(url)) {return _PROTOCOL + url;}
    else if (new RegExp(/^\/.*/).test(url)) {return _URL + url;}
    else {return false;}
  }
  , checkUrl = url => {
    if (new RegExp(_URL.replace('//','\/\/').replace('.','\.')).test(url)) {return url;}
    else {return false};
  }
  , fetch = (url, level) => {
    _BLOOM.add(url);
    console.log((_BLOOM.size()*100/_SPACE).toFixed() + '% ' + url);
    request(url, (err, res, body) => {
      if (!err) {
        model.create({url:url, body:body}, err => {});
        cheerio.load(body)('a').each((i, v) => {
          var u = checkUrl(prefixUrl(v.attribs.href));
          var l = level - 1;
          u && !_BLOOM.test(u) && l>0 && fetch(u,l);
        });
      }
    });
  };
fetch(_URL, _LEVEL);