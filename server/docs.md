Metadata Properties
pptx.title = 'My Awesome Presentation';
pptx.author = 'Brent Ely';
pptx.subject = 'Annual Report';
pptx.company = 'Computer Science Chair';
pptx.revision = '15';


Slide Layout
pptx.layout = 'LAYOUT_WIDE';

Adding a Slide
let slide1 = pptx.addSlide();
slide1
  .addImage({ path: "img1.png", x: 1, y: 2 })
  .addImage({ path: "img2.jpg", x: 5, y: 3 });
slide1.addText("Slide One", { x: 1, y: 1 });

Slide Properties
Option	Type	Default	Description	Possible Values
background	BackgroundProps	FFFFFF	background color/images	add background color or image DataOrPathProps and/or ShapeFillProps
color	string	000000	default text color	hex color or scheme color.
hidden	boolean	false	whether slide is hidden	Ex: slide.hidden = true
newAutoPagedSlides	PresSlide[]		all slides created by autopaging	Contains slides automatically created when content (e.g. a table) overflows the current slide using autoPage:true
slideNumber	SlideNumberProps		slide number props	(see examples below)

Example: Background/Foreground
// EX: Use several methods to set a background
slide.background = { color: "F1F1F1" }; // Solid color
slide.background = { color: "FF3399", transparency: 50 }; // hex fill color with transparency of 50%
slide.background = { data: "image/png;base64,ABC[...]123" }; // image: base64 data
slide.background = { path: "https://some.url/image.jpg" }; // image: url


// EX: Set slide default font color
slide.color = "696969";

Example: Slide Number
// EX: Add a Slide Number at a given location
slide.slideNumber = { x: 1.0, y: "90%" };

// EX: Styled Slide Numbers
slide.slideNumber = { x: 1.0, y: "95%", fontFace: "Courier", fontSize: 32, color: "CF0101" };

Section Example
import pptxgen from "pptxgenjs";
let pptx = new pptxgen();

// STEP 1: Create a section
pptx.addSection({ title: "Tables" });

// STEP 2: Provide section title to a slide that you want in corresponding section
let slide = pptx.addSlide({ sectionTitle: "Tables" });

slide.addText("This slide is in the Tables section!", { x: 1.5, y: 1.5, fontSize: 18, color: "363636" });
pptx.writeFile({ fileName: "Section Sample.pptx" });

PowerPoint Shape Types
// Shapes without text
slide.addShape(pres.ShapeType.rect, { fill: { color: "FF0000" } });
slide.addShape(pres.ShapeType.ellipse, {
  fill: { type: "solid", color: "0088CC" },
});
slide.addShape(pres.ShapeType.line, { line: { color: "FF0000", width: 1 } });

// Shapes with text
slide.addText("ShapeType.rect", {
  shape: pres.ShapeType.rect,
  fill: { color: "FF0000" },
});
slide.addText("ShapeType.ellipse", {
  shape: pres.ShapeType.ellipse,
  fill: { color: "FF0000" },
});
slide.addText("ShapeType.line", {
  shape: pres.ShapeType.line,
  line: { color: "FF0000", width: 1, dashType: "lgDash" },
});

more:
ShapeType {
		'accentBorderCallout1' = 'accentBorderCallout1',
		'accentBorderCallout2' = 'accentBorderCallout2',
		'accentBorderCallout3' = 'accentBorderCallout3',
		'accentCallout1' = 'accentCallout1',
		'accentCallout2' = 'accentCallout2',
		'accentCallout3' = 'accentCallout3',
		'actionButtonBackPrevious' = 'actionButtonBackPrevious',
		'actionButtonBeginning' = 'actionButtonBeginning',
		'actionButtonBlank' = 'actionButtonBlank',
		'actionButtonDocument' = 'actionButtonDocument',
		'actionButtonEnd' = 'actionButtonEnd',
		'actionButtonForwardNext' = 'actionButtonForwardNext',
		'actionButtonHelp' = 'actionButtonHelp',
		'actionButtonHome' = 'actionButtonHome',
		'actionButtonInformation' = 'actionButtonInformation',
		'actionButtonMovie' = 'actionButtonMovie',
		'actionButtonReturn' = 'actionButtonReturn',
		'actionButtonSound' = 'actionButtonSound',
		'arc' = 'arc',
		'bentArrow' = 'bentArrow',
		'bentUpArrow' = 'bentUpArrow',
		'bevel' = 'bevel',
		'blockArc' = 'blockArc',
		'borderCallout1' = 'borderCallout1',
		'borderCallout2' = 'borderCallout2',
		'borderCallout3' = 'borderCallout3',
		'bracePair' = 'bracePair',
		'bracketPair' = 'bracketPair',
		'callout1' = 'callout1',
		'callout2' = 'callout2',
		'callout3' = 'callout3',
		'can' = 'can',
		'chartPlus' = 'chartPlus',
		'chartStar' = 'chartStar',
		'chartX' = 'chartX',
		'chevron' = 'chevron',
		'chord' = 'chord',
		'circularArrow' = 'circularArrow',
		'cloud' = 'cloud',
		'cloudCallout' = 'cloudCallout',
		'corner' = 'corner',
		'cornerTabs' = 'cornerTabs',
		'cube' = 'cube',
		'curvedDownArrow' = 'curvedDownArrow',
		'curvedLeftArrow' = 'curvedLeftArrow',
		'curvedRightArrow' = 'curvedRightArrow',
		'curvedUpArrow' = 'curvedUpArrow',
		'decagon' = 'decagon',
		'diagStripe' = 'diagStripe',
		'diamond' = 'diamond',
		'dodecagon' = 'dodecagon',
		'donut' = 'donut',
		'doubleWave' = 'doubleWave',
		'downArrow' = 'downArrow',
		'downArrowCallout' = 'downArrowCallout',
		'ellipse' = 'ellipse',
		'ellipseRibbon' = 'ellipseRibbon',
		'ellipseRibbon2' = 'ellipseRibbon2',
		'flowChartAlternateProcess' = 'flowChartAlternateProcess',
		'flowChartCollate' = 'flowChartCollate',
		'flowChartConnector' = 'flowChartConnector',
		'flowChartDecision' = 'flowChartDecision',
		'flowChartDelay' = 'flowChartDelay',
		'flowChartDisplay' = 'flowChartDisplay',
		'flowChartDocument' = 'flowChartDocument',
		'flowChartExtract' = 'flowChartExtract',
		'flowChartInputOutput' = 'flowChartInputOutput',
		'flowChartInternalStorage' = 'flowChartInternalStorage',
		'flowChartMagneticDisk' = 'flowChartMagneticDisk',
		'flowChartMagneticDrum' = 'flowChartMagneticDrum',
		'flowChartMagneticTape' = 'flowChartMagneticTape',
		'flowChartManualInput' = 'flowChartManualInput',
		'flowChartManualOperation' = 'flowChartManualOperation',
		'flowChartMerge' = 'flowChartMerge',
		'flowChartMultidocument' = 'flowChartMultidocument',
		'flowChartOfflineStorage' = 'flowChartOfflineStorage',
		'flowChartOffpageConnector' = 'flowChartOffpageConnector',
		'flowChartOnlineStorage' = 'flowChartOnlineStorage',
		'flowChartOr' = 'flowChartOr',
		'flowChartPredefinedProcess' = 'flowChartPredefinedProcess',
		'flowChartPreparation' = 'flowChartPreparation',
		'flowChartProcess' = 'flowChartProcess',
		'flowChartPunchedCard' = 'flowChartPunchedCard',
		'flowChartPunchedTape' = 'flowChartPunchedTape',
		'flowChartSort' = 'flowChartSort',
		'flowChartSummingJunction' = 'flowChartSummingJunction',
		'flowChartTerminator' = 'flowChartTerminator',
		'folderCorner' = 'folderCorner',
		'frame' = 'frame',
		'funnel' = 'funnel',
		'gear6' = 'gear6',
		'gear9' = 'gear9',
		'halfFrame' = 'halfFrame',
		'heart' = 'heart',
		'heptagon' = 'heptagon',
		'hexagon' = 'hexagon',
		'homePlate' = 'homePlate',
		'horizontalScroll' = 'horizontalScroll',
		'irregularSeal1' = 'irregularSeal1',
		'irregularSeal2' = 'irregularSeal2',
		'leftArrow' = 'leftArrow',
		'leftArrowCallout' = 'leftArrowCallout',
		'leftBrace' = 'leftBrace',
		'leftBracket' = 'leftBracket',
		'leftCircularArrow' = 'leftCircularArrow',
		'leftRightArrow' = 'leftRightArrow',
		'leftRightArrowCallout' = 'leftRightArrowCallout',
		'leftRightCircularArrow' = 'leftRightCircularArrow',
		'leftRightRibbon' = 'leftRightRibbon',
		'leftRightUpArrow' = 'leftRightUpArrow',
		'leftUpArrow' = 'leftUpArrow',
		'lightningBolt' = 'lightningBolt',
		'line' = 'line',
		'lineInv' = 'lineInv',
		'mathDivide' = 'mathDivide',
		'mathEqual' = 'mathEqual',
		'mathMinus' = 'mathMinus',
		'mathMultiply' = 'mathMultiply',
		'mathNotEqual' = 'mathNotEqual',
		'mathPlus' = 'mathPlus',
		'moon' = 'moon',
		'nonIsoscelesTrapezoid' = 'nonIsoscelesTrapezoid',
		'noSmoking' = 'noSmoking',
		'notchedRightArrow' = 'notchedRightArrow',
		'octagon' = 'octagon',
		'parallelogram' = 'parallelogram',
		'pentagon' = 'pentagon',
		'pie' = 'pie',
		'pieWedge' = 'pieWedge',
		'plaque' = 'plaque',
		'plaqueTabs' = 'plaqueTabs',
		'plus' = 'plus',
		'quadArrow' = 'quadArrow',
		'quadArrowCallout' = 'quadArrowCallout',
		'rect' = 'rect',
		'ribbon' = 'ribbon',
		'ribbon2' = 'ribbon2',
		'rightArrow' = 'rightArrow',
		'rightArrowCallout' = 'rightArrowCallout',
		'rightBrace' = 'rightBrace',
		'rightBracket' = 'rightBracket',
		'round1Rect' = 'round1Rect',
		'round2DiagRect' = 'round2DiagRect',
		'round2SameRect' = 'round2SameRect',
		'roundRect' = 'roundRect',
		'rtTriangle' = 'rtTriangle',
		'smileyFace' = 'smileyFace',
		'snip1Rect' = 'snip1Rect',
		'snip2DiagRect' = 'snip2DiagRect',
		'snip2SameRect' = 'snip2SameRect',
		'snipRoundRect' = 'snipRoundRect',
		'squareTabs' = 'squareTabs',
		'star10' = 'star10',
		'star12' = 'star12',
		'star16' = 'star16',
		'star24' = 'star24',
		'star32' = 'star32',
		'star4' = 'star4',
		'star5' = 'star5',
		'star6' = 'star6',
		'star7' = 'star7',
		'star8' = 'star8',
		'stripedRightArrow' = 'stripedRightArrow',
		'sun' = 'sun',
		'swooshArrow' = 'swooshArrow',
		'teardrop' = 'teardrop',
		'trapezoid' = 'trapezoid',
		'triangle' = 'triangle',
		'upArrow' = 'upArrow',
		'upArrowCallout' = 'upArrowCallout',
		'upDownArrow' = 'upDownArrow',
		'upDownArrowCallout' = 'upDownArrowCallout',
		'uturnArrow' = 'uturnArrow',
		'verticalScroll' = 'verticalScroll',
		'wave' = 'wave',
		'wedgeEllipseCallout' = 'wedgeEllipseCallout',
		'wedgeRectCallout' = 'wedgeRectCallout',
		'wedgeRoundRectCallout' = 'wedgeRoundRectCallout',
	}

Position/Size Props (PositionProps)
Name	Type	Default	Description	Possible Values
x	number	1.0	hor location (inches)	0-n
x	string		hor location (percent)	'n%'. (Ex: {x:'50%'} middle of the Slide)
y	number	1.0	ver location (inches)	0-n
y	string		ver location (percent)	'n%'. (Ex: {y:'50%'} middle of the Slide)
w	number	1.0	width (inches)	0-n
w	string		width (percent)	'n%'. (Ex: {w:'50%'} 50% the Slide width)
h	number	1.0	height (inches)	0-n
h	string		height (percent)	'n%'. (Ex: {h:'50%'} 50% the Slide height)
Shape Props (ShapeProps)
Name	Type	Description	Possible Values
align	string	alignment	left or center or right. Default: left
fill	ShapeFillProps	fill props	Fill color/transparency props
flipH	boolean	flip Horizontal	true or false
flipV	boolean	flip Vertical	true or false
hyperlink	HyperlinkProps	hyperlink props	(see type link)
line	ShapeLineProps	border line props	(see type link)
rectRadius	number	rounding radius	0 to 1. (Ex: 0.5. Only for pptx.shapes.ROUNDED_RECTANGLE)
rotate	number	rotation (degrees)	-360 to 360. Default: 0
shadow	ShadowProps	shadow props	(see type link)
shapeName	string	optional shape name	Ex: "Customer Network Diagram 99"

Images
Usage
// Image from remote URL
slide.addImage({ path: "https://upload.wikimedia.org/wikipedia/en/a/a9/Example.jpg" });

// Image by local URL
slide.addImage({ path: "images/chart_world_peace_near.png" });

// Image by data (pre-encoded base64)
slide.addImage({ data: "image/png;base64,iVtDafDrBF[...]=" });

Base Properties
Position/Size Props (PositionProps)
Option	Type	Default	Description	Possible Values
x	number	1.0	hor location (inches)	0-n
x	string		hor location (percent)	'n%'. (Ex: {x:'50%'} middle of the Slide)
y	number	1.0	ver location (inches)	0-n
y	string		ver location (percent)	'n%'. (Ex: {y:'50%'} middle of the Slide)
w	number	1.0	width (inches)	0-n
w	string		width (percent)	'n%'. (Ex: {w:'50%'} 50% the Slide width)
h	number	1.0	height (inches)	0-n
h	string		height (percent)	'n%'. (Ex: {h:'50%'} 50% the Slide height)
Data/Path Props (DataOrPathProps)
Option	Type	Default	Description	Possible Values
data	string		image data (base64)	base64-encoded image string. (either data or path is required)
path	string		image path	Same as used in an (img src="") tag. (either data or path is required)
Image Props (ImageProps)
Option	Type	Default	Description	Possible Values
altText	string		alt text value	description of what image shows
flipH	boolean	false	Flip horizontally?	true, false
flipV	boolean	false	Flip vertical?	true, false
hyperlink	HyperlinkProps		add hyperlink	object with url or slide
placeholder	string		image placeholder	Placeholder location: title, body
rotate	integer	0	rotation (degrees)	Rotation degress: 0-359
rounding	boolean	false	image rounding	Shapes an image into a circle
sizing	object		transforms image	See Image Sizing
transparency	number	0	changes opacity of an image	0-100 where 0 means image is completely visible
Sizing Properties
The sizing option provides cropping and scaling an image to a specified area. The property expects an object with the following structure:

Property	Type	Unit	Default	Description	Possible Values
type	string			sizing algorithm	'crop', 'contain' or 'cover'
w	number	inches	w of the image	area width	0-n
h	number	inches	h of the image	area height	0-n
x	number	inches	0	area horizontal position related to the image	0-n (effective for crop only)
y	number	inches	0	area vertical position related to the image	0-n (effective for crop only)

Text
Usage
slide.addText([{ text: "TEXT", options: { OPTIONS } }]);
Properties
Position/Size Props (PositionProps)
Name	Type	Default	Description	Possible Values
x	number	1.0	hor location (inches)	0-n
x	string		hor location (percent)	'n%'. (Ex: {x:'50%'} middle of the Slide)
y	number	1.0	ver location (inches)	0-n
y	string		ver location (percent)	'n%'. (Ex: {y:'50%'} middle of the Slide)
w	number	1.0	width (inches)	0-n
w	string		width (percent)	'n%'. (Ex: {w:'50%'} 50% the Slide width)
h	number	1.0	height (inches)	0-n
h	string		height (percent)	'n%'. (Ex: {h:'50%'} 50% the Slide height)
Base Properties (TextPropsOptions)
Option	Type	Unit	Default	Description	Possible Values
align	string		left	alignment	left or center or right
autoFit	boolean		false	"Fit to Shape"	true or false
baseline	number	points		text baseline value	0-256
bold	boolean		false	bold text	true or false
breakLine	boolean		false	appends a line break	true or false (only applies when used in text options) Ex: {text:'hi', options:{breakLine:true}}
bullet	boolean		false	bulleted text	true or false
bullet	object			bullet options	object with type, code or style. Ex: bullet:{type:'number'}. Ex: bullet:{code:'2605'}. Ex: {style:'alphaLcPeriod'}
charSpacing	number	points		character spacing	1-256. Ex: { charSpacing:12 }
color	string			text color	hex color code or scheme color. Ex: { color:'0088CC' }
fill	string			fill/bkgd color	hex color code or scheme color. Ex: { color:'0088CC' }
fit	string		none	text fit options	none, shrink, resize. Ex: { fit:'shrink' }
fontFace	string			font face	Ex: { fontFace:'Arial'}
fontSize	number	points		font size	1-256. Ex: { fontSize:12 }
glow	object			text glow	object with size, opacity, color (opt). Ex: glow:{size:10, opacity:0.75, color:'0088CC'}
highlight	string			highlight color	hex color code or scheme color. Ex: { color:'0088CC' }
hyperlink	string			add hyperlink	object with url or slide (tooltip optional). Ex: { hyperlink:{url:'https://github.com'} }
indentLevel	number	level	0	bullet indent level	1-32. Ex: { indentLevel:1 }
inset	number	inches		inset/padding	1-256. Ex: { inset:1.25 }
isTextBox	boolean		false	PPT "Textbox"	true or false
italic	boolean		false	italic text	true or false
lang	string		en-US	language setting	Ex: { lang:'zh-TW' } (Set this when using non-English fonts like Chinese)
line	object			line/border	adds a border. Ex: line:{ width:'2', color:'A9A9A9' }
lineSpacing	number	points		line spacing points	1-256. Ex: { lineSpacing:28 }
lineSpacingMultiple	number	percent		line spacing multiple	0.0-9.99
margin	number	points		margin	0-99 (ProTip: use the same value from CSS padding)
outline	object			text outline options	Options: color & size. Ex: outline:{ size:1.5, color:'FF0000' }
paraSpaceAfter	number	points		paragraph spacing	Paragraph Spacing: After. Ex: { paraSpaceAfter:12 }
paraSpaceBefore	number	points		paragraph spacing	Paragraph Spacing: Before. Ex: { paraSpaceBefore:12 }
rectRadius	number	inches		rounding radius	rounding radius for ROUNDED_RECTANGLE text shapes
rotate	integer	degrees	0	text rotation degrees	0-360. Ex: {rotate:180}
rtlMode	boolean		false	enable Right-to-Left mode	true or false
shadow	object			text shadow options	see "Shadow Properties" below. Ex: shadow:{ type:'outer' }
softBreakBefore	boolean		false	soft (shift-enter) break	Add a soft line-break (shift+enter) before line text content
strike	string			text strikethrough	dblStrike or sngStrike
subscript	boolean		false	subscript text	true or false
superscript	boolean		false	superscript text	true or false
transparency	number		0	transparency	Percentage: 0-100
underline	TextUnderlineProps			underline color/style	TextUnderlineProps
valign	string			vertical alignment	top or middle or bottom
vert	string		horz	text direction	eaVert or horz or mongolianVert or vert or vert270 or wordArtVert or wordArtVertRtl
wrap	boolean		true	text wrapping	true or false
Shadow Properties (ShadowProps)
Option	Type	Unit	Default	Description	Possible Values
type	string		outer	shadow type	outer or inner
angle	number	degrees		shadow angle	0-359. Ex: { angle:180 }
blur	number	points		blur size	1-256. Ex: { blur:3 }
color	string			text color	hex color code or scheme color constant. Ex: { color:'0088CC' }
offset	number	points		offset size	1-256. Ex: { offset:8 }
opacity	number	percent		opacity	0-1. Ex: opacity:0.75

Hyperlink Props (HyperlinkProps)
Name	Type	Description	Possible Values
slide	number	link to a given slide	Ex: 2
tooltip	string	link tooltip text	Ex: Click to visit home page
url	string	target URL	Ex: https://wikipedia.org
