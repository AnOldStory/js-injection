# Bundled third-party libraries

These files are shipped inside the extension package and injected locally with
`chrome.scripting.executeScript({ files: [...] })`. They are not downloaded at
runtime.

| File | Project | Version | License |
| --- | --- | --- | --- |
| `jquery-3.7.1.min.js` | [jQuery](https://jquery.com/) | 3.7.1 | MIT |
| `lodash-4.17.21.min.js` | [Lodash](https://lodash.com/) | 4.17.21 | MIT |
| `axios-1.7.9.min.js` | [Axios](https://axios-http.com/) | 1.7.9 | MIT |
| `dayjs-1.11.13.min.js` | [Day.js](https://day.js.org/) | 1.11.13 | MIT |

Copyright notices:

- jQuery: Copyright OpenJS Foundation and other contributors, <https://openjsf.org/>
- Lodash: Copyright OpenJS Foundation and other contributors, <https://openjsf.org/>
- Axios: Copyright (c) 2014-present Matt Zabriskie & contributors
- Day.js: Copyright (c) 2018-present iamkun

## MIT License

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
