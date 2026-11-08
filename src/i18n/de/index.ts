import type { Dict } from './types';
import help from './help';
import panels from './panels';
import screens from './screens';
import studio from './studio';
import utils from './utils';

// قاموس لكل مجموعة ملفات، يُدمج هنا
const all: Dict = Object.assign({}, help, studio, screens, panels, utils);
export default all;
