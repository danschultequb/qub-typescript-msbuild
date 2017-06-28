import * as assert from "assert";
import * as qub from "qub";
import * as xml from "qub-xml";

import * as msbuild from "../sources/MSBuild";

function parseXmlLexes(text: string, startIndex: number = 0): qub.Indexable<xml.Lex> {
    return new xml.Lexer(text, startIndex).toArrayList();
}

/**
 * Parse an XML Name Segment from the provided text at the provided start index.
 */
function parseXmlName(text: string, startIndex: number = 0): xml.Name {
    return new xml.Name(parseXmlLexes(text, startIndex));
}

/**
 * Parse an XML QuotedString Segment from the provided text at the provided start index.
 */
function parseXmlQuotedString(text: string, startIndex: number = 0): xml.QuotedString {
    return new xml.QuotedString(parseXmlLexes(text, startIndex));
}

function parseXmlUnrecognizedTag(text: string, startIndex: number = 0): xml.UnrecognizedTag {
    return new xml.UnrecognizedTag(parseXmlLexes(text, startIndex));
}

function parseXmlText(text: string, startIndex: number = 0): xml.Text {
    return new xml.Text(parseXmlLexes(text, startIndex));
}

function parseXmlAttribute(text: string, startIndex: number = 0): xml.Attribute {
    const tokenizer = new xml.Tokenizer(text, startIndex);
    const tagSegments = new qub.ArrayList<xml.Segment>();
    return tokenizer.readAttribute(tagSegments);
}

function parseXmlEmptyElement(text: string, startIndex: number = 0): xml.EmptyElement {
    const tokenizer = new xml.Tokenizer(text, startIndex);
    assert.deepEqual(tokenizer.next(), true);
    assert(tokenizer.getCurrent() instanceof xml.EmptyElement, "The first segment of an EmptyElement's text must be an EmptyElement.");
    return tokenizer.getCurrent() as xml.EmptyElement;
}

function parseXmlElement(text: string, startIndex: number = 0): xml.Element {
    const tokenizer = new xml.Tokenizer(text, startIndex);
    assert.deepEqual(tokenizer.next(), true);
    assert(tokenizer.getCurrent() instanceof xml.StartTag, "The first segment of an Element's text must be a start tag.");
    return xml.parseElement(tokenizer);
}

function parseAttribute(text: string, startIndex: number = 0): msbuild.Attribute {
    return new msbuild.Attribute(parseXmlAttribute(text, startIndex));
}

function parseImportEmptyElement(text: string, startIndex: number = 0): msbuild.ImportElement {
    return new msbuild.ImportElement(parseXmlEmptyElement(text, startIndex));
}

function parseItemEmptyElement(text: string, startIndex: number = 0): msbuild.ItemElement {
    return new msbuild.ItemElement(parseXmlEmptyElement(text, startIndex));
}

function parseProjectElement(text: string, startIndex: number = 0): msbuild.ProjectElement {
    return new msbuild.ProjectElement(parseXmlElement(text, startIndex));
}

function parseOtherwiseEmptyElement(text: string, startIndex: number = 0): msbuild.OtherwiseElement {
    return new msbuild.OtherwiseElement(parseXmlEmptyElement(text, startIndex));
}

function parseWhenEmptyElement(text: string, startIndex: number = 0): msbuild.WhenElement {
    return new msbuild.WhenElement(parseXmlEmptyElement(text, startIndex));
}

function parseProjectEmptyElement(text: string, startIndex: number = 0): msbuild.ProjectElement {
    return new msbuild.ProjectElement(parseXmlEmptyElement(text, startIndex));
}

function parseNegateOperator(text: string, startIndex: number = 0): msbuild.Operator {
    const lexes: qub.Iterable<xml.Lex> = parseXmlLexes(text, startIndex);
    return msbuild.createNegateOperator(lexes);
}

function parseEqualsOperator(text: string, startIndex: number = 0): msbuild.Operator {
    const lexes: qub.Iterable<xml.Lex> = parseXmlLexes(text, startIndex);
    return msbuild.createEqualsOperator(lexes);
}

function parseNotEqualsOperator(text: string, startIndex: number = 0): msbuild.Operator {
    const lexes: qub.Iterable<xml.Lex> = parseXmlLexes(text, startIndex);
    return msbuild.createNotEqualsOperator(lexes);
}

function parseUnquotedStringExpression(text: string, startIndex: number = 0): msbuild.UnquotedStringExpression {
    const lexes: qub.Iterable<xml.Lex> = parseXmlLexes(text, startIndex);
    return new msbuild.UnquotedStringExpression(lexes);
}

function parsePropertyExpression(text: string, startIndex: number = 0): msbuild.PropertyExpression {
    const lexes: qub.Iterable<xml.Lex> = parseXmlLexes(text, startIndex);
    return new msbuild.PropertyExpression(lexes);
}

function parseItemExpression(text: string, startIndex: number = 0): msbuild.ItemExpression {
    const lexes: qub.Iterable<xml.Lex> = parseXmlLexes(text, startIndex);
    return new msbuild.ItemExpression(lexes);
}

suite("MSBuild", () => {
    suite("getXMLTextSegments()", () => {
        test("with undefined", () => {
            assert.throws(() => msbuild.getXMLTextSegments(undefined));
        });

        test("with null", () => {
            assert.throws(() => msbuild.getXMLTextSegments(null));
        });

        test("with empty", () => {
            const segments = new qub.ArrayList<xml.Segment>();
            const textSegments: qub.Iterable<xml.Text> = msbuild.getXMLTextSegments(segments);
            assert.deepStrictEqual(textSegments.toArray(), []);
        });

        test("with no text segments", () => {
            const segments = new qub.ArrayList<xml.Segment>([parseXmlName("hello", 0), parseXmlQuotedString(`"there"`, 5)]);
            const textSegments: qub.Iterable<xml.Text> = msbuild.getXMLTextSegments(segments);
            assert.deepStrictEqual(textSegments.toArray(), []);
        });

        test("with text segments", () => {
            const segments = new qub.ArrayList<xml.Segment>([parseXmlName("hello", 0), parseXmlText(`"there"`, 5)]);
            const textSegments: qub.Iterable<xml.Text> = msbuild.getXMLTextSegments(segments);
            assert.deepStrictEqual(textSegments.toArray(), [parseXmlText(`"there"`, 5)]);
        });
    });

    suite("getXMLElementsAndUnrecognizedTags()", () => {
        test("with undefined", () => {
            assert.throws(() => msbuild.getXMLElementsAndUnrecognizedTags(undefined));
        });

        test("with null", () => {
            assert.throws(() => msbuild.getXMLElementsAndUnrecognizedTags(null));
        });

        test("with empty", () => {
            const segments = new qub.ArrayList<xml.Segment>();
            const result: qub.Iterable<xml.Element | xml.EmptyElement | xml.UnrecognizedTag> = msbuild.getXMLElementsAndUnrecognizedTags(segments);
            assert.deepStrictEqual(result.toArray(), []);
        });

        test("with no elements, empty elements, or unrecognized tags", () => {
            const segments = new qub.ArrayList<xml.Segment>([parseXmlName("hello", 0), parseXmlQuotedString(`"there"`, 5)]);
            const result: qub.Iterable<xml.Element | xml.EmptyElement | xml.UnrecognizedTag> = msbuild.getXMLElementsAndUnrecognizedTags(segments);
            assert.deepStrictEqual(result.toArray(), []);
        });

        test("with elements", () => {
            const segments = new qub.ArrayList<xml.Segment>([parseXmlElement("<apples></apples>"), parseXmlText(`"there"`, 5), parseXmlElement("<b><c/></b>")]);
            const result: qub.Iterable<xml.Element | xml.EmptyElement | xml.UnrecognizedTag> = msbuild.getXMLElementsAndUnrecognizedTags(segments);
            assert.deepStrictEqual(result.toArray(), [parseXmlElement("<apples></apples>"), parseXmlElement("<b><c/></b>")]);
        });

        test("with empty elements", () => {
            const segments = new qub.ArrayList<xml.Segment>([parseXmlEmptyElement("<apples/>"), parseXmlEmptyElement("<oops/>"), parseXmlText(`"there"`, 5)]);
            const result: qub.Iterable<xml.Element | xml.EmptyElement | xml.UnrecognizedTag> = msbuild.getXMLElementsAndUnrecognizedTags(segments);
            assert.deepStrictEqual(result.toArray(), [parseXmlEmptyElement("<apples/>"), parseXmlEmptyElement("<oops/>")]);
        });

        test("with unrecognized tags", () => {
            const segments = new qub.ArrayList<xml.Segment>([parseXmlUnrecognizedTag("<>"), parseXmlName("oops"), parseXmlText(`"there"`, 5), parseXmlUnrecognizedTag("<)")]);
            const result: qub.Iterable<xml.Element | xml.EmptyElement | xml.UnrecognizedTag> = msbuild.getXMLElementsAndUnrecognizedTags(segments);
            assert.deepStrictEqual(result.toArray(), [parseXmlUnrecognizedTag("<>"), parseXmlUnrecognizedTag("<)")]);
        });
    });

    suite("getXMLElements()", () => {
        test("with undefined", () => {
            assert.throws(() => msbuild.getXMLElements(undefined));
        });

        test("with null", () => {
            assert.throws(() => msbuild.getXMLElements(null));
        });

        test("with empty", () => {
            const segments = new qub.ArrayList<xml.Segment>();
            const result: qub.Iterable<xml.Element | xml.EmptyElement> = msbuild.getXMLElements(segments);
            assert.deepStrictEqual(result.toArray(), []);
        });

        test("with no elements, empty elements, or unrecognized tags", () => {
            const segments = new qub.ArrayList<xml.Segment>([parseXmlName("hello", 0), parseXmlQuotedString(`"there"`, 5)]);
            const result: qub.Iterable<xml.Element | xml.EmptyElement> = msbuild.getXMLElements(segments);
            assert.deepStrictEqual(result.toArray(), []);
        });

        test("with elements", () => {
            const segments = new qub.ArrayList<xml.Segment>([parseXmlElement("<apples></apples>"), parseXmlText(`"there"`, 5), parseXmlElement("<b><c/></b>")]);
            const result: qub.Iterable<xml.Element | xml.EmptyElement> = msbuild.getXMLElements(segments);
            assert.deepStrictEqual(result.toArray(), [parseXmlElement("<apples></apples>"), parseXmlElement("<b><c/></b>")]);
        });

        test("with empty elements", () => {
            const segments = new qub.ArrayList<xml.Segment>([parseXmlEmptyElement("<apples/>"), parseXmlEmptyElement("<oops/>"), parseXmlText(`"there"`, 5)]);
            const result: qub.Iterable<xml.Element | xml.EmptyElement> = msbuild.getXMLElements(segments);
            assert.deepStrictEqual(result.toArray(), [parseXmlEmptyElement("<apples/>"), parseXmlEmptyElement("<oops/>")]);
        });

        test("with unrecognized tags", () => {
            const segments = new qub.ArrayList<xml.Segment>([parseXmlUnrecognizedTag("<>"), parseXmlName("oops"), parseXmlText(`"there"`, 5), parseXmlUnrecognizedTag("<)")]);
            const result: qub.Iterable<xml.Element | xml.EmptyElement> = msbuild.getXMLElements(segments);
            assert.deepStrictEqual(result.toArray(), []);
        });
    });

    suite("getXMLElementName()", () => {
        test("with undefined", () => {
            assert.deepStrictEqual(msbuild.getXMLElementName(undefined), undefined);
        });

        test("with null", () => {
            assert.deepStrictEqual(msbuild.getXMLElementName(null), undefined);
        });

        test("with element", () => {
            assert.deepStrictEqual(msbuild.getXMLElementName(parseXmlElement("<a></a>")), parseXmlName("a", 1));
        });

        test("with empty element", () => {
            assert.deepStrictEqual(msbuild.getXMLElementName(parseXmlEmptyElement("<b/>")), parseXmlName("b", 1));
        });

        test("with unrecognized tag", () => {
            assert.deepStrictEqual(msbuild.getXMLElementName(parseXmlUnrecognizedTag("<")), undefined);
        });
    });

    suite("getXMLElementNameString()", () => {
        test("with undefined", () => {
            assert.deepStrictEqual(msbuild.getXMLElementNameString(undefined), undefined);
        });

        test("with null", () => {
            assert.deepStrictEqual(msbuild.getXMLElementNameString(null), undefined);
        });

        test("with element", () => {
            assert.deepStrictEqual(msbuild.getXMLElementNameString(parseXmlElement("<a></a>")), "a");
        });

        test("with empty element", () => {
            assert.deepStrictEqual(msbuild.getXMLElementNameString(parseXmlEmptyElement("<b/>")), "b");
        });

        test("with unrecognized tag", () => {
            assert.deepStrictEqual(msbuild.getXMLElementNameString(parseXmlUnrecognizedTag("<")), undefined);
        });
    });

    suite("Operator", () => {
        test("with undefined lexes", () => {
            const o = new msbuild.Operator(undefined, 7);
            assert.deepStrictEqual(o.startIndex, undefined);
            assert.deepStrictEqual(o.afterEndIndex, undefined);
            assert.deepStrictEqual(o.length, 0);
            assert.deepStrictEqual(o.span, undefined);
            assert.deepStrictEqual(o.precedence, 7);
            assert.deepStrictEqual(o.toString(), "");
        });

        test("with null lexes", () => {
            const o = new msbuild.Operator(null, 3);
            assert.deepStrictEqual(o.startIndex, undefined);
            assert.deepStrictEqual(o.afterEndIndex, undefined);
            assert.deepStrictEqual(o.length, 0);
            assert.deepStrictEqual(o.span, undefined);
            assert.deepStrictEqual(o.precedence, 3);
            assert.deepStrictEqual(o.toString(), "");
        });

        test("with empty lexes", () => {
            const o = new msbuild.Operator(new qub.ArrayList<xml.Lex>(), 0);
            assert.deepStrictEqual(o.startIndex, undefined);
            assert.deepStrictEqual(o.afterEndIndex, undefined);
            assert.deepStrictEqual(o.length, 0);
            assert.deepStrictEqual(o.span, undefined);
            assert.deepStrictEqual(o.precedence, 0);
            assert.deepStrictEqual(o.toString(), "");
        });

        test(`with "="`, () => {
            const o = new msbuild.Operator(parseXmlLexes("="), 11);
            assert.deepStrictEqual(o.startIndex, 0);
            assert.deepStrictEqual(o.afterEndIndex, 1);
            assert.deepStrictEqual(o.length, 1);
            assert.deepStrictEqual(o.span, new qub.Span(0, 1));
            assert.deepStrictEqual(o.precedence, 11);
            assert.deepStrictEqual(o.toString(), "=");
        });
    });

    suite("UnquotedStringExpression", () => {
        test("with undefined lexes", () => {
            const e = new msbuild.UnquotedStringExpression(undefined);
            assert.deepStrictEqual(e.startIndex, undefined);
            assert.deepStrictEqual(e.afterEndIndex, undefined);
            assert.deepStrictEqual(e.toString(), "");
        });

        test("with null lexes", () => {
            const e = new msbuild.UnquotedStringExpression(null);
            assert.deepStrictEqual(e.startIndex, undefined);
            assert.deepStrictEqual(e.afterEndIndex, undefined);
            assert.deepStrictEqual(e.toString(), "");
        });

        test("with empty lexes", () => {
            const e = new msbuild.UnquotedStringExpression(new qub.ArrayList<xml.Lex>());
            assert.deepStrictEqual(e.startIndex, undefined);
            assert.deepStrictEqual(e.afterEndIndex, undefined);
            assert.deepStrictEqual(e.toString(), "");
        });

        test(`with "abc123"`, () => {
            const e = new msbuild.UnquotedStringExpression(parseXmlLexes("abc123"));
            assert.deepStrictEqual(e.startIndex, 0);
            assert.deepStrictEqual(e.afterEndIndex, 6);
            assert.deepStrictEqual(e.toString(), "abc123");
        });
    });

    suite("QuotedStringExpression", () => {
        test("with no start quote, inner expression, or end quote", () => {
            const e = new msbuild.QuotedStringExpression(undefined, undefined, undefined);
            assert.throws(() => e.startIndex);
            assert.throws(() => e.afterEndIndex);
            assert.throws(() => e.toString());
        });

        test("with single start quote, but no inner expression or end quote", () => {
            const e = new msbuild.QuotedStringExpression(xml.SingleQuote(15), undefined, undefined);
            assert.deepStrictEqual(e.startIndex, 15);
            assert.deepStrictEqual(e.afterEndIndex, 16);
            assert.deepStrictEqual(e.toString(), "'");
        });

        test("with double start quote, but no inner expression or end quote", () => {
            const e = new msbuild.QuotedStringExpression(xml.DoubleQuote(16), undefined, undefined);
            assert.deepStrictEqual(e.startIndex, 16);
            assert.deepStrictEqual(e.afterEndIndex, 17);
            assert.deepStrictEqual(e.toString(), `"`);
        });

        test("with single start quote and inner expression, but no end quote", () => {
            const e = new msbuild.QuotedStringExpression(xml.SingleQuote(17), parseUnquotedStringExpression("hello", 18), undefined);
            assert.deepStrictEqual(e.startIndex, 17);
            assert.deepStrictEqual(e.afterEndIndex, 23);
            assert.deepStrictEqual(e.toString(), `'hello`);
        });

        test("with double start quote and inner expression, but no end quote", () => {
            const e = new msbuild.QuotedStringExpression(xml.DoubleQuote(18), parseUnquotedStringExpression("there", 19), undefined);
            assert.deepStrictEqual(e.startIndex, 18);
            assert.deepStrictEqual(e.afterEndIndex, 24);
            assert.deepStrictEqual(e.toString(), `"there`);
        });

        test("with single start quote and end quote, but no inner expression", () => {
            const e = new msbuild.QuotedStringExpression(xml.SingleQuote(17), undefined, xml.SingleQuote(18));
            assert.deepStrictEqual(e.startIndex, 17);
            assert.deepStrictEqual(e.afterEndIndex, 19);
            assert.deepStrictEqual(e.toString(), `''`);
        });

        test("with double start quote and end quote, but no inner expression", () => {
            const e = new msbuild.QuotedStringExpression(xml.DoubleQuote(18), undefined, xml.DoubleQuote(19));
            assert.deepStrictEqual(e.startIndex, 18);
            assert.deepStrictEqual(e.afterEndIndex, 20);
            assert.deepStrictEqual(e.toString(), `""`);
        });

        test("with single start quote and end quote, and inner expression", () => {
            const e = new msbuild.QuotedStringExpression(xml.SingleQuote(17), parsePropertyExpression("$(prop)", 18), xml.SingleQuote(25));
            assert.deepStrictEqual(e.startIndex, 17);
            assert.deepStrictEqual(e.afterEndIndex, 26);
            assert.deepStrictEqual(e.toString(), `'$(prop)'`);
        });

        test("with double start quote and end quote, and inner expression", () => {
            const e = new msbuild.QuotedStringExpression(xml.DoubleQuote(18), parseItemExpression("@(item)", 19), xml.DoubleQuote(26));
            assert.deepStrictEqual(e.startIndex, 18);
            assert.deepStrictEqual(e.afterEndIndex, 27);
            assert.deepStrictEqual(e.toString(), `"@(item)"`);
        });
    });

    suite("PropertyExpression", () => {
        function propertyExpressionTest(text: string): void {
            test(`with ${qub.escapeAndQuote(text)}`, () => {
                const e = new msbuild.PropertyExpression(parseXmlLexes(text));
                assert.deepStrictEqual(e.startIndex, 0);
                assert.deepStrictEqual(e.afterEndIndex, text.length);
                assert.deepStrictEqual(e.toString(), text);
            });
        }

        propertyExpressionTest("$(");
        propertyExpressionTest("$(a");
        propertyExpressionTest("$()");
        propertyExpressionTest("$(a)");
    });

    suite("ItemExpression", () => {
        function itemExpressionTest(text: string): void {
            test(`with ${qub.escapeAndQuote(text)}`, () => {
                const e = new msbuild.ItemExpression(parseXmlLexes(text));
                assert.deepStrictEqual(e.startIndex, 0);
                assert.deepStrictEqual(e.afterEndIndex, text.length);
                assert.deepStrictEqual(e.toString(), text);
            });
        }

        itemExpressionTest("@(");
        itemExpressionTest("@(a");
        itemExpressionTest("@()");
        itemExpressionTest("@(a)");
    });

    suite("ConcatenateExpression", () => {
        const e = new msbuild.ConcatenateExpression(parseUnquotedStringExpression("hello "), parseUnquotedStringExpression("there!", 6));
        assert.deepStrictEqual(e.startIndex, 0);
        assert.deepStrictEqual(e.afterEndIndex, 12);
        assert.deepStrictEqual(e.toString(), "hello there!");
    });

    suite("BinaryExpression", () => {
        test("with no left expression or right expression", () => {
            const e = new msbuild.BinaryExpression(undefined, parseEqualsOperator("==", 20), undefined);
            assert.deepStrictEqual(e.startIndex, 20);
            assert.deepStrictEqual(e.afterEndIndex, 22);
            assert.deepStrictEqual(e.toString(), "==");
        });

        test("with left expression but no right expression", () => {
            const e = new msbuild.BinaryExpression(parseUnquotedStringExpression("left", 16), parseEqualsOperator("==", 20), undefined);
            assert.deepStrictEqual(e.startIndex, 16);
            assert.deepStrictEqual(e.afterEndIndex, 22);
            assert.deepStrictEqual(e.toString(), "left==");
        });

        test("with right expression but no left expression", () => {
            const e = new msbuild.BinaryExpression(undefined, parseEqualsOperator("==", 20), parseUnquotedStringExpression("right", 22));
            assert.deepStrictEqual(e.startIndex, 20);
            assert.deepStrictEqual(e.afterEndIndex, 27);
            assert.deepStrictEqual(e.toString(), "==right");
        });

        test("with left and right expressions", () => {
            const e = new msbuild.BinaryExpression(parseUnquotedStringExpression("left", 16), parseEqualsOperator("==", 20), parseUnquotedStringExpression("right", 22));
            assert.deepStrictEqual(e.startIndex, 16);
            assert.deepStrictEqual(e.afterEndIndex, 27);
            assert.deepStrictEqual(e.toString(), "left==right");
        });
    });

    suite("PrefixExpression", () => {
        test("with operator but no expression", () => {
            const operator = new msbuild.Operator(parseXmlLexes("!", 23), msbuild.OperatorPrecedence.PrefixNegate);
            const expression: msbuild.Expression = undefined;
            const prefixExpression = new msbuild.PrefixExpression(operator, expression);
            assert.deepEqual(prefixExpression.startIndex, 23);
            assert.deepEqual(prefixExpression.afterEndIndex, 24);
            assert.deepStrictEqual(prefixExpression.toString(), "!");
        });

        test("with operator and expression", () => {
            const operator = new msbuild.Operator(parseXmlLexes("!", 9), msbuild.OperatorPrecedence.PrefixNegate);
            const expression: msbuild.Expression = new msbuild.UnquotedStringExpression(parseXmlLexes("false", 10));
            const prefixExpression = new msbuild.PrefixExpression(operator, expression);
            assert.deepEqual(prefixExpression.startIndex, 9);
            assert.deepEqual(prefixExpression.afterEndIndex, 15);
            assert.deepStrictEqual(prefixExpression.toString(), "!false");
        });
    });

    suite("PrefixExpressionBuilder", () => {
        suite("hasPrecedenceGreaterThanOrEqualTo()", () => {
            test("with undefined", () => {
                const operator = new msbuild.Operator(parseXmlLexes("!", 23), msbuild.OperatorPrecedence.PrefixNegate);
                const builder = new msbuild.PrefixExpressionBuilder(operator);
                assert.deepStrictEqual(builder.hasPrecedenceGreaterThanOrEqualTo(undefined), true);
            });

            test("with PrefixExpressionBuilder", () => {
                const operator = new msbuild.Operator(parseXmlLexes("!", 23), msbuild.OperatorPrecedence.PrefixNegate);
                const builder = new msbuild.PrefixExpressionBuilder(operator);
                assert.deepStrictEqual(builder.hasPrecedenceGreaterThanOrEqualTo(builder), false);
            });

            test("with Unquoted", () => {
                const operator = new msbuild.Operator(parseXmlLexes("!", 23), msbuild.OperatorPrecedence.PrefixNegate);
                const builder = new msbuild.PrefixExpressionBuilder(operator);
                assert.deepStrictEqual(builder.hasPrecedenceGreaterThanOrEqualTo(new msbuild.BinaryExpressionBuilder(undefined, undefined)), true);
            });
        });
    });

    suite("Attribute", () => {
        function attributeTest(attributeText: string, expectedName: xml.Name, expectedValue?: xml.QuotedString, expectedExpression?: msbuild.Expression): void {
            test(`with ${qub.escapeAndQuote(attributeText)}`, () => {
                const xmlAttribute: xml.Attribute = parseXmlAttribute(attributeText);
                const attribute = new msbuild.Attribute(xmlAttribute);
                assert.deepStrictEqual(attribute.name, expectedName);
                assert.deepStrictEqual(attribute.value, expectedValue);
                assert.deepStrictEqual(attribute.expression, expectedExpression);

                for (let i = -1; i <= attributeText.length + 1; ++i) {
                    assert.deepStrictEqual(attribute.containsIndex(i), xmlAttribute.containsIndex(i));
                }
            });
        }

        attributeTest("name", parseXmlName("name"));
        attributeTest("name=", parseXmlName("name"));
        attributeTest("name =", parseXmlName("name"));
        attributeTest(`name="`, parseXmlName("name"), parseXmlQuotedString(`"`, 5));
        attributeTest(`name=""`, parseXmlName("name"), parseXmlQuotedString(`""`, 5));
        attributeTest(`name="I'm a value"`,
            parseXmlName("name"),
            parseXmlQuotedString(`"I'm a value"`, 5),
            parseUnquotedStringExpression("I'm a value", 6));
        attributeTest(`condition="I'm a value"`,
            parseXmlName("condition"),
            parseXmlQuotedString(`"I'm a value"`, 10),
            new msbuild.ConcatenateExpression(
                parseUnquotedStringExpression("I", 11),
                new msbuild.QuotedStringExpression(
                    xml.SingleQuote(12),
                    parseUnquotedStringExpression("m a value", 13),
                    undefined)));
    });

    suite("ProjectElement", () => {
        test(`with undefined`, () => {
            const projectElement = new msbuild.ProjectElement(undefined);
            assert.deepStrictEqual(projectElement.span, undefined);
            assert.deepStrictEqual(projectElement.defaultTargets, undefined);
            assert.deepStrictEqual(projectElement.initialTargets, undefined);
            assert.deepStrictEqual(projectElement.toolsVersion, undefined);
            assert.deepStrictEqual(projectElement.treatAsLocalProperty, undefined);
            assert.deepStrictEqual(projectElement.xmlns, undefined);
            for (let i = -1; i <= 1; ++i) {
                assert.deepStrictEqual(projectElement.containsIndex(i), false);
            }
        });

        test(`with null`, () => {
            const projectElement = new msbuild.ProjectElement(null);
            assert.deepStrictEqual(projectElement.span, undefined);
            assert.deepStrictEqual(projectElement.defaultTargets, undefined);
            assert.deepStrictEqual(projectElement.initialTargets, undefined);
            assert.deepStrictEqual(projectElement.toolsVersion, undefined);
            assert.deepStrictEqual(projectElement.treatAsLocalProperty, undefined);
            assert.deepStrictEqual(projectElement.xmlns, undefined);
            for (let i = -1; i <= 1; ++i) {
                assert.deepStrictEqual(projectElement.containsIndex(i), false);
            }
        });

        interface ProjectElementDetails {
            defaultTargets?: msbuild.Attribute;
            initialTargets?: msbuild.Attribute;
            toolsVersion?: msbuild.Attribute;
            treatAsLocalProperty?: msbuild.Attribute;
            xmlns?: msbuild.Attribute;
        }

        function projectElementTest(elementText: string, expectedAttributes?: ProjectElementDetails, expectedChildElements: msbuild.Element[] = []): void {
            test(`with ${qub.escapeAndQuote(elementText)}`, () => {
                const xmlElement: xml.Element = parseXmlElement(elementText);
                const projectElement = new msbuild.ProjectElement(xmlElement);
                assert.deepStrictEqual(projectElement.span, xmlElement.span);
                assert.deepStrictEqual(projectElement.defaultTargets, expectedAttributes && expectedAttributes.defaultTargets);
                assert.deepStrictEqual(projectElement.containsAttribute("DefaultTargets"), expectedAttributes && expectedAttributes.defaultTargets ? true : false);
                assert.deepStrictEqual(projectElement.initialTargets, expectedAttributes && expectedAttributes.initialTargets);
                assert.deepStrictEqual(projectElement.containsAttribute("InitialTargets"), expectedAttributes && expectedAttributes.initialTargets ? true : false);
                assert.deepStrictEqual(projectElement.toolsVersion, expectedAttributes && expectedAttributes.toolsVersion);
                assert.deepStrictEqual(projectElement.containsAttribute("ToolsVersion"), expectedAttributes && expectedAttributes.toolsVersion ? true : false);
                assert.deepStrictEqual(projectElement.treatAsLocalProperty, expectedAttributes && expectedAttributes.treatAsLocalProperty);
                assert.deepStrictEqual(projectElement.containsAttribute("TreatAsLocalProperty"), expectedAttributes && expectedAttributes.treatAsLocalProperty ? true : false);
                assert.deepStrictEqual(projectElement.xmlns, expectedAttributes && expectedAttributes.xmlns);
                assert.deepStrictEqual(projectElement.containsAttribute("Xmlns"), expectedAttributes && expectedAttributes.xmlns ? true : false);

                for (let i = -1; i <= xmlElement.afterEndIndex + 1; ++i) {
                    let expectedName: xml.Name = undefined;
                    if (xmlElement.startTag && xmlElement.startTag.getName() && xmlElement.startTag.getName().containsIndex(i)) {
                        expectedName = xmlElement.startTag.getName();
                    }
                    else if (xmlElement.endTag && xmlElement.endTag.name && xmlElement.endTag.name.containsIndex(i)) {
                        expectedName = xmlElement.endTag.name;
                    }
                    assert.deepStrictEqual(projectElement.getContainingName(i), expectedName);
                }

                assert.deepStrictEqual(projectElement.getChildElements().toArray(), expectedChildElements);
            });
        }

        projectElementTest("<a></a>");
        projectElementTest("<project></project>");
        projectElementTest("<Project></Project>");
        projectElementTest(`<project defaulttargets="a" initialtargets="b" toolsversion="c" treataslocalproperty="d" xmlns="e"></project>`, {
            defaultTargets: parseAttribute(`defaulttargets="a"`, 9),
            initialTargets: parseAttribute(`initialtargets="b"`, 28),
            toolsVersion: parseAttribute(`toolsversion="c"`, 47),
            treatAsLocalProperty: parseAttribute(`treataslocalproperty="d"`, 64),
            xmlns: parseAttribute(`xmlns="e"`, 89)
        });
        projectElementTest(`<Project DefaultTargets="a" InitialTargets="b" ToolsVersion="c" TreatAsLocalProperty="d" Xmlns="e"></Project>`, {
            defaultTargets: parseAttribute(`DefaultTargets="a"`, 9),
            initialTargets: parseAttribute(`InitialTargets="b"`, 28),
            toolsVersion: parseAttribute(`ToolsVersion="c"`, 47),
            treatAsLocalProperty: parseAttribute(`TreatAsLocalProperty="d"`, 64),
            xmlns: parseAttribute(`Xmlns="e"`, 89)
        });
        projectElementTest(`<Project DefaultTargets="a" DefaultTargets="b"></Project>`, {
            defaultTargets: parseAttribute(`DefaultTargets="a"`, 9),
        });
        projectElementTest(`<Project InitialTargets="a" InitialTargets="b"></Project>`, {
            initialTargets: parseAttribute(`InitialTargets="a"`, 9),
        });
        projectElementTest(`<Project ToolsVersion="a" ToolsVersion="b"></Project>`, {
            toolsVersion: parseAttribute(`ToolsVersion="a"`, 9),
        });
        projectElementTest(`<Project TreatAsLocalProperty="a" TreatAsLocalProperty="b"></Project>`, {
            treatAsLocalProperty: parseAttribute(`TreatAsLocalProperty="a"`, 9),
        });
        projectElementTest(`<Project Xmlns="a" Xmlns="b"></Project>`, {
            xmlns: parseAttribute(`Xmlns="a"`, 9),
        });
        projectElementTest(`<Project spam="a"></Project>`);
        projectElementTest(`<Project><Spam/></Project>`, undefined, [new msbuild.UnrecognizedElement(parseXmlEmptyElement("<Spam/>", 9))]);

        function projectEmptyElementTest(emptyElementText: string, expectedAttributes?: ProjectElementDetails): void {
            test(`with ${qub.escapeAndQuote(emptyElementText)}`, () => {
                const xmlEmptyElement: xml.EmptyElement = parseXmlEmptyElement(emptyElementText);
                const projectElement = new msbuild.ProjectElement(xmlEmptyElement);
                assert.deepStrictEqual(projectElement.span, xmlEmptyElement.span);
                assert.deepStrictEqual(projectElement.defaultTargets, expectedAttributes && expectedAttributes.defaultTargets);
                assert.deepStrictEqual(projectElement.initialTargets, expectedAttributes && expectedAttributes.initialTargets);
                assert.deepStrictEqual(projectElement.toolsVersion, expectedAttributes && expectedAttributes.toolsVersion);
                assert.deepStrictEqual(projectElement.treatAsLocalProperty, expectedAttributes && expectedAttributes.treatAsLocalProperty);
                assert.deepStrictEqual(projectElement.xmlns, expectedAttributes && expectedAttributes.xmlns);
                assert.deepStrictEqual(projectElement.getChildElements().toArray(), []);
            });
        }

        projectEmptyElementTest(`<a/>`);
        projectEmptyElementTest(`<project/>`);
        projectEmptyElementTest(`<Project/>`);
        projectEmptyElementTest(`<project defaulttargets="a" initialtargets="b" toolsversion="c" treataslocalproperty="d" xmlns="e"/>`, {
            defaultTargets: parseAttribute(`defaulttargets="a"`, 9),
            initialTargets: parseAttribute(`initialtargets="b"`, 28),
            toolsVersion: parseAttribute(`toolsversion="c"`, 47),
            treatAsLocalProperty: parseAttribute(`treataslocalproperty="d"`, 64),
            xmlns: parseAttribute(`xmlns="e"`, 89)
        });
        projectEmptyElementTest(`<Project DefaultTargets="a" InitialTargets="b" ToolsVersion="c" TreatAsLocalProperty="d" Xmlns="e"/>`, {
            defaultTargets: parseAttribute(`DefaultTargets="a"`, 9),
            initialTargets: parseAttribute(`InitialTargets="b"`, 28),
            toolsVersion: parseAttribute(`ToolsVersion="c"`, 47),
            treatAsLocalProperty: parseAttribute(`TreatAsLocalProperty="d"`, 64),
            xmlns: parseAttribute(`Xmlns="e"`, 89)
        });
        projectEmptyElementTest(`<Project DefaultTargets="a" DefaultTargets="b"/>`, {
            defaultTargets: parseAttribute(`DefaultTargets="a"`, 9),
        });
        projectEmptyElementTest(`<Project InitialTargets="a" InitialTargets="b"/>`, {
            initialTargets: parseAttribute(`InitialTargets="a"`, 9),
        });
        projectEmptyElementTest(`<Project ToolsVersion="a" ToolsVersion="b"/>`, {
            toolsVersion: parseAttribute(`ToolsVersion="a"`, 9),
        });
        projectEmptyElementTest(`<Project TreatAsLocalProperty="a" TreatAsLocalProperty="b"/>`, {
            treatAsLocalProperty: parseAttribute(`TreatAsLocalProperty="a"`, 9),
        });
        projectEmptyElementTest(`<Project Xmlns="a" Xmlns="b"/>`, {
            xmlns: parseAttribute(`Xmlns="a"`, 9),
        });
        projectEmptyElementTest(`<Project bubblegum="a"/>`);
    });

    suite("ChooseElement", () => {
        function chooseElementTest(text: string, names: xml.Name[], whens: msbuild.WhenElement[] = [], otherwise?: msbuild.OtherwiseElement): void {
            test(`with ${qub.escapeAndQuote(text)}`, () => {
                const xmlElement = parseXmlElement(text);
                const chooseElement = new msbuild.ChooseElement(xmlElement);
                assert.deepStrictEqual(chooseElement.attributes.toArray(), []);
                assert.deepStrictEqual(chooseElement.names.toArray(), names);
                assert.deepStrictEqual(chooseElement.span, new qub.Span(0, text.length));
                assert.deepStrictEqual(chooseElement.type, msbuild.ElementType.Choose);
                assert.deepStrictEqual(chooseElement.whens.toArray(), whens);
                assert.deepStrictEqual(chooseElement.otherwise, otherwise);
            });
        }

        chooseElementTest("<Choose",
            [parseXmlName("Choose", 1)]);

        chooseElementTest(`<Choose><When/><Otherwise/></Choose>`,
            [parseXmlName("Choose", 1), parseXmlName("Choose", 29)],
            [parseWhenEmptyElement("<When/>", 8)],
            parseOtherwiseEmptyElement("<Otherwise/>", 15));
    });

    suite("ImportElement", () => {
        function importTest(text: string, names: xml.Name[], attributes: msbuild.Attribute[] = [], project?: msbuild.Attribute, condition?: msbuild.Attribute): void {
            test(`with ${qub.escapeAndQuote(text)}`, () => {
                const xmlElement: xml.EmptyElement = parseXmlEmptyElement(text);
                const importElement = new msbuild.ImportElement(xmlElement);
                assert.deepStrictEqual(importElement.names.toArray(), [parseXmlName("Import", 1)]);
                assert.deepStrictEqual(importElement.attributes.toArray(), attributes);
                assert.deepStrictEqual(importElement.span, new qub.Span(0, text.length));
                assert.deepStrictEqual(importElement.type, msbuild.ElementType.Import);
                assert.deepStrictEqual(importElement.project, project);
                assert.deepStrictEqual(importElement.condition, condition);

                assert.deepStrictEqual(importElement.getChildElements().toArray(), []);
            });
        }

        importTest("<Import/>",
            [parseXmlName("Import", 1)]);

        importTest(`<Import Project="abc" Condition="test" />`,
            [parseXmlName("Import", 1)],
            [
                parseAttribute(`Project="abc"`, 8),
                parseAttribute(`Condition="test"`, 22)
            ],
            parseAttribute(`Project="abc"`, 8),
            parseAttribute(`Condition="test"`, 22));
    });

    suite("ImportGroupElement", () => {
        function importGroupElementTest(text: string, names: xml.Name[], attributes: msbuild.Attribute[] = [], condition?: msbuild.Attribute, imports: msbuild.ImportElement[] = []): void {
            test(`with ${qub.escapeAndQuote(text)}`, () => {
                const xmlElement = parseXmlElement(text);
                const importGroupElement = new msbuild.ImportGroupElement(xmlElement);
                assert.deepStrictEqual(importGroupElement.names.toArray(), names, "Wrong names");
                assert.deepStrictEqual(importGroupElement.attributes.toArray(), attributes, "Wrong attributes");
                assert.deepStrictEqual(importGroupElement.span, new qub.Span(0, text.length));
                assert.deepStrictEqual(importGroupElement.type, msbuild.ElementType.ImportGroup);
                assert.deepStrictEqual(importGroupElement.condition, condition, "Wrong condition");
                assert.deepStrictEqual(importGroupElement.imports.toArray(), imports, "Wrong imports");
            });
        }

        importGroupElementTest("<ImportGroup></ImportGroup>",
            [parseXmlName("ImportGroup", 1), parseXmlName("ImportGroup", 15)]);

        importGroupElementTest(`<ImportGroup Condition="blah"><Import/></ImportGroup>`,
            [parseXmlName("ImportGroup", 1), parseXmlName("ImportGroup", 41)],
            [parseAttribute(`Condition="blah"`, 13)],
            parseAttribute(`Condition="blah"`, 13),
            [parseImportEmptyElement(`<Import/>`, 30)]);
    });

    suite("ItemDefinitionGroupElement", () => {
        function itemDefinitionGroupElementTest(text: string, names: xml.Name[], attributes: msbuild.Attribute[] = [], condition?: msbuild.Attribute, items: msbuild.ItemElement[] = []): void {
            test(`with ${qub.escapeAndQuote(text)}`, () => {
                const itemDefinitionGroupElement = new msbuild.ItemDefinitionGroupElement(parseXmlElement(text));
                assert.deepStrictEqual(itemDefinitionGroupElement.names.toArray(), names, "Wrong names");
                assert.deepStrictEqual(itemDefinitionGroupElement.attributes.toArray(), attributes, "Wrong attributes");
                assert.deepStrictEqual(itemDefinitionGroupElement.span, new qub.Span(0, text.length), "Wrong span");
                assert.deepStrictEqual(itemDefinitionGroupElement.type, msbuild.ElementType.ItemDefinitionGroup, "Wrong type");
                assert.deepStrictEqual(itemDefinitionGroupElement.condition, condition, "Wrong condition");
                assert.deepStrictEqual(itemDefinitionGroupElement.items.toArray(), items, "Wrong items");
            });
        }

        itemDefinitionGroupElementTest("<ItemDefinitionGroup></ItemDefinitionGroup>",
            [parseXmlName("ItemDefinitionGroup", 1), parseXmlName("ItemDefinitionGroup", 23)]);

        itemDefinitionGroupElementTest(`<ItemDefinitionGroup Condition="blah"><Cheese/><Apples/></ItemDefinitionGroup>`,
            [parseXmlName("ItemDefinitionGroup", 1), parseXmlName("ItemDefinitionGroup", 58)],
            [parseAttribute(`Condition="blah"`, 21)],
            parseAttribute(`Condition="blah"`, 21),
            [
                parseItemEmptyElement(`<Cheese/>`, 38),
                parseItemEmptyElement(`<Apples/>`, 47)
            ]);
    });

    suite("ItemGroupElement", () => {
        function itemGroupElementTest(text: string, names: xml.Name[], attributes: msbuild.Attribute[] = [], condition?: msbuild.Attribute, label?: msbuild.Attribute, items: msbuild.ItemElement[] = []): void {
            test(`with ${qub.escapeAndQuote(text)}`, () => {
                const itemGroupElement = new msbuild.ItemGroupElement(parseXmlElement(text));
                assert.deepStrictEqual(itemGroupElement.names.toArray(), names, "Wrong names");
                assert.deepStrictEqual(itemGroupElement.attributes.toArray(), attributes, "Wrong attributes");
                assert.deepStrictEqual(itemGroupElement.span, new qub.Span(0, text.length), "Wrong span");
                assert.deepStrictEqual(itemGroupElement.type, msbuild.ElementType.ItemGroup, "Wrong type");
                assert.deepStrictEqual(itemGroupElement.condition, condition, "Wrong condition");
                assert.deepStrictEqual(itemGroupElement.label, label, "Wrong label");
                assert.deepStrictEqual(itemGroupElement.items.toArray(), items, "Wrong items");
            });
        }

        itemGroupElementTest("<ItemGroup></ItemGroup>",
            [parseXmlName("ItemGroup", 1), parseXmlName("ItemGroup", 13)]);

        itemGroupElementTest(`<ItemGroup Condition="blah" Label="place"><Cheese/><Apples/></ItemGroup>`,
            [parseXmlName("ItemGroup", 1), parseXmlName("ItemGroup", 62)],
            [parseAttribute(`Condition="blah"`, 11), parseAttribute(`Label="place"`, 28)],
            parseAttribute(`Condition="blah"`, 11),
            parseAttribute(`Label="place"`, 28),
            [
                parseItemEmptyElement(`<Cheese/>`, 42),
                parseItemEmptyElement(`<Apples/>`, 51)
            ]);
    });

    suite("ItemMetadataElement", () => {
        function itemMetadataElementTest(text: string, names: xml.Name[], attributes: msbuild.Attribute[] = []): void {
            test(`with ${qub.escapeAndQuote(text)}`, () => {
                const itemGroupElement = new msbuild.ItemMetadataElement(parseXmlElement(text));
                assert.deepStrictEqual(itemGroupElement.names.toArray(), names, "Wrong names");
                assert.deepStrictEqual(itemGroupElement.attributes.toArray(), attributes, "Wrong attributes");
                assert.deepStrictEqual(itemGroupElement.span, new qub.Span(0, text.length), "Wrong span");
                assert.deepStrictEqual(itemGroupElement.type, msbuild.ElementType.ItemMetadata, "Wrong type");
            });
        }

        itemMetadataElementTest("<spam></spam>",
            [parseXmlName("spam", 1), parseXmlName("spam", 8)]);

        itemMetadataElementTest(`<apples Condition="blah"></apples>`,
            [parseXmlName("apples", 1), parseXmlName("apples", 27)],
            [new msbuild.Attribute(parseXmlAttribute(`Condition="blah"`, 8))]);
    });

    suite("OnErrorElement", () => {
        function onErrorElementTest(text: string, names: xml.Name[], attributes: msbuild.Attribute[] = [], expectedCondition?: msbuild.Attribute, expectedExecuteTargets?: msbuild.Attribute): void {
            test(`with ${qub.escapeAndQuote(text)}`, () => {
                const onErrorElement = new msbuild.OnErrorElement(parseXmlElement(text));
                assert.deepStrictEqual(onErrorElement.names.toArray(), names, "Wrong names");
                assert.deepStrictEqual(onErrorElement.attributes.toArray(), attributes, "Wrong attributes");
                assert.deepStrictEqual(onErrorElement.span, new qub.Span(0, text.length), "Wrong span");
                assert.deepStrictEqual(onErrorElement.type, msbuild.ElementType.OnError, "Wrong type");
                assert.deepStrictEqual(onErrorElement.condition, expectedCondition);
                assert.deepStrictEqual(onErrorElement.executeTargets, expectedExecuteTargets);
            });
        }

        onErrorElementTest("<OnError></OnError>",
            [parseXmlName("OnError", 1), parseXmlName("OnError", 11)]);

        onErrorElementTest(`<OnError Condition="blah"></OnError>`,
            [parseXmlName("OnError", 1), parseXmlName("OnError", 28)],
            [new msbuild.Attribute(parseXmlAttribute(`Condition="blah"`, 9))],
            new msbuild.Attribute(parseXmlAttribute(`Condition="blah"`, 9)));

        onErrorElementTest(`<OnError ExecuteTargets="blahTarget"></OnError>`,
            [parseXmlName("OnError", 1), parseXmlName("OnError", 39)],
            [new msbuild.Attribute(parseXmlAttribute(`ExecuteTargets="blahTarget"`, 9))],
            undefined,
            new msbuild.Attribute(parseXmlAttribute(`ExecuteTargets="blahTarget"`, 9)));
    });

    suite("OutputElement", () => {
        function outputElementTest(text: string, names: xml.Name[], attributes: msbuild.Attribute[] = []): void {
            test(`with ${qub.escapeAndQuote(text)}`, () => {
                const outputElement = new msbuild.OutputElement(parseXmlElement(text));
                assert.deepStrictEqual(outputElement.names.toArray(), names, "Wrong names");
                assert.deepStrictEqual(outputElement.attributes.toArray(), attributes, "Wrong attributes");
                assert.deepStrictEqual(outputElement.span, new qub.Span(0, text.length), "Wrong span");
                assert.deepStrictEqual(outputElement.type, msbuild.ElementType.Output, "Wrong type");
            });
        }

        outputElementTest("<Output></Output>",
            [parseXmlName("Output", 1), parseXmlName("Output", 10)]);

        outputElementTest(`<Output Condition="blah"></Output>`,
            [parseXmlName("Output", 1), parseXmlName("Output", 27)],
            [new msbuild.Attribute(parseXmlAttribute(`Condition="blah"`, 8))]);
    });

    suite("ParameterElement", () => {
        function parameterElementTest(text: string, names: xml.Name[], attributes: msbuild.Attribute[] = []): void {
            test(`with ${qub.escapeAndQuote(text)}`, () => {
                const parameterElement = new msbuild.ParameterElement(parseXmlElement(text));
                assert.deepStrictEqual(parameterElement.names.toArray(), names, "Wrong names");
                assert.deepStrictEqual(parameterElement.attributes.toArray(), attributes, "Wrong attributes");
                assert.deepStrictEqual(parameterElement.span, new qub.Span(0, text.length), "Wrong span");
                assert.deepStrictEqual(parameterElement.type, msbuild.ElementType.Parameter, "Wrong type");
            });
        }

        parameterElementTest("<Parameter></Parameter>",
            [parseXmlName("Parameter", 1), parseXmlName("Parameter", 13)]);

        parameterElementTest(`<Parameter Condition="blah"></Parameter>`,
            [parseXmlName("Parameter", 1), parseXmlName("Parameter", 30)],
            [new msbuild.Attribute(parseXmlAttribute(`Condition="blah"`, 11))]);
    });

    suite("ParameterGroupElement", () => {
        function parameterGroupElementTest(text: string, names: xml.Name[], attributes: msbuild.Attribute[] = []): void {
            test(`with ${qub.escapeAndQuote(text)}`, () => {
                const parameterGroupElement = new msbuild.ParameterGroupElement(parseXmlElement(text));
                assert.deepStrictEqual(parameterGroupElement.names.toArray(), names, "Wrong names");
                assert.deepStrictEqual(parameterGroupElement.attributes.toArray(), attributes, "Wrong attributes");
                assert.deepStrictEqual(parameterGroupElement.span, new qub.Span(0, text.length), "Wrong span");
                assert.deepStrictEqual(parameterGroupElement.type, msbuild.ElementType.ParameterGroup, "Wrong type");
            });
        }

        parameterGroupElementTest("<ParameterGroup></ParameterGroup>",
            [parseXmlName("ParameterGroup", 1), parseXmlName("ParameterGroup", 18)]);

        parameterGroupElementTest(`<ParameterGroup Condition="blah"></ParameterGroup>`,
            [parseXmlName("ParameterGroup", 1), parseXmlName("ParameterGroup", 35)],
            [new msbuild.Attribute(parseXmlAttribute(`Condition="blah"`, 16))]);
    });

    suite("ProjectExtensionsElement", () => {
        function projectExtensionsElementTest(text: string, names: xml.Name[], attributes: msbuild.Attribute[] = []): void {
            test(`with ${qub.escapeAndQuote(text)}`, () => {
                const projectExtensionsElement = new msbuild.ProjectExtensionsElement(parseXmlElement(text));
                assert.deepStrictEqual(projectExtensionsElement.names.toArray(), names, "Wrong names");
                assert.deepStrictEqual(projectExtensionsElement.attributes.toArray(), attributes, "Wrong attributes");
                assert.deepStrictEqual(projectExtensionsElement.span, new qub.Span(0, text.length), "Wrong span");
                assert.deepStrictEqual(projectExtensionsElement.type, msbuild.ElementType.ProjectExtensions, "Wrong type");
            });
        }

        projectExtensionsElementTest("<ProjectExtensions></ProjectExtensions>",
            [parseXmlName("ProjectExtensions", 1), parseXmlName("ProjectExtensions", 21)]);

        projectExtensionsElementTest(`<ProjectExtensions Condition="blah"></ProjectExtensions>`,
            [parseXmlName("ProjectExtensions", 1), parseXmlName("ProjectExtensions", 38)],
            [new msbuild.Attribute(parseXmlAttribute(`Condition="blah"`, 19))]);
    });

    suite("PropertyElement", () => {
        function propertyElementTest(text: string, names: xml.Name[], attributes: msbuild.Attribute[] = []): void {
            test(`with ${qub.escapeAndQuote(text)}`, () => {
                const projectExtensionsElement = new msbuild.PropertyElement(parseXmlElement(text));
                assert.deepStrictEqual(projectExtensionsElement.names.toArray(), names, "Wrong names");
                assert.deepStrictEqual(projectExtensionsElement.attributes.toArray(), attributes, "Wrong attributes");
                assert.deepStrictEqual(projectExtensionsElement.span, new qub.Span(0, text.length), "Wrong span");
                assert.deepStrictEqual(projectExtensionsElement.type, msbuild.ElementType.Property, "Wrong type");
            });
        }

        propertyElementTest("<Lollipop></Lollipop>",
            [parseXmlName("Lollipop", 1), parseXmlName("Lollipop", 12)]);

        propertyElementTest(`<Lollipop Condition="blah"></Lollipop>`,
            [parseXmlName("Lollipop", 1), parseXmlName("Lollipop", 29)],
            [new msbuild.Attribute(parseXmlAttribute(`Condition="blah"`, 10))]);
    });

    suite("PropertyGroupElement", () => {
        function propertyGroupElementTest(text: string, names: xml.Name[], attributes: msbuild.Attribute[] = [], expectedCondition?: msbuild.Attribute): void {
            test(`with ${qub.escapeAndQuote(text)}`, () => {
                const propertyGroupElement = new msbuild.PropertyGroupElement(parseXmlElement(text));
                assert.deepStrictEqual(propertyGroupElement.names.toArray(), names, "Wrong names");
                assert.deepStrictEqual(propertyGroupElement.attributes.toArray(), attributes, "Wrong attributes");
                assert.deepStrictEqual(propertyGroupElement.span, new qub.Span(0, text.length), "Wrong span");
                assert.deepStrictEqual(propertyGroupElement.type, msbuild.ElementType.PropertyGroup, "Wrong type");
                assert.deepStrictEqual(propertyGroupElement.condition, expectedCondition);
            });
        }

        propertyGroupElementTest("<PropertyGroup></PropertyGroup>",
            [parseXmlName("PropertyGroup", 1), parseXmlName("PropertyGroup", 17)]);

        propertyGroupElementTest(`<PropertyGroup Condition="blah"></PropertyGroup>`,
            [parseXmlName("PropertyGroup", 1), parseXmlName("PropertyGroup", 34)],
            [new msbuild.Attribute(parseXmlAttribute(`Condition="blah"`, 15))],
            new msbuild.Attribute(parseXmlAttribute(`Condition="blah"`, 15)));
    });

    suite("TargetElement", () => {
        function targetElementTest(text: string, names: xml.Name[], attributes: msbuild.Attribute[] = []): void {
            test(`with ${qub.escapeAndQuote(text)}`, () => {
                const targetElement = new msbuild.TargetElement(parseXmlElement(text));
                assert.deepStrictEqual(targetElement.names.toArray(), names, "Wrong names");
                assert.deepStrictEqual(targetElement.attributes.toArray(), attributes, "Wrong attributes");
                assert.deepStrictEqual(targetElement.span, new qub.Span(0, text.length), "Wrong span");
                assert.deepStrictEqual(targetElement.type, msbuild.ElementType.Target, "Wrong type");
            });
        }

        targetElementTest("<Target></Target>",
            [parseXmlName("Target", 1), parseXmlName("Target", 10)]);

        targetElementTest(`<Target Condition="blah"></Target>`,
            [parseXmlName("Target", 1), parseXmlName("Target", 27)],
            [new msbuild.Attribute(parseXmlAttribute(`Condition="blah"`, 8))]);
    });

    suite("UnrecognizedElement", () => {
        test(`with "<"`, () => {
            const xmlElement = new xml.UnrecognizedTag(parseXmlLexes("<"));
            const unrecognizedElement = new msbuild.UnrecognizedElement(xmlElement);
            assert.deepStrictEqual(unrecognizedElement.attributes.toArray(), []);
            assert.deepStrictEqual(unrecognizedElement.names.toArray(), []);
            assert.deepStrictEqual(unrecognizedElement.span, new qub.Span(0, 1));
            assert.deepStrictEqual(unrecognizedElement.type, msbuild.ElementType.Unrecognized);

            for (let i = -1; i <= 2; ++i) {
                assert.deepStrictEqual(unrecognizedElement.containsIndex(i), 1 <= i);
                assert.deepStrictEqual(unrecognizedElement.getContainingName(i), undefined);
            }

            assert.deepStrictEqual(unrecognizedElement.getChildElements().toArray(), []);
        });

        test(`with "<>"`, () => {
            const xmlElement = new xml.UnrecognizedTag(parseXmlLexes("<>"));
            const unrecognizedElement = new msbuild.UnrecognizedElement(xmlElement);
            assert.deepStrictEqual(unrecognizedElement.attributes.toArray(), []);
            assert.deepStrictEqual(unrecognizedElement.names.toArray(), []);
            assert.deepStrictEqual(unrecognizedElement.span, new qub.Span(0, 2));
            assert.deepStrictEqual(unrecognizedElement.type, msbuild.ElementType.Unrecognized);

            for (let i = -1; i <= 3; ++i) {
                assert.deepStrictEqual(unrecognizedElement.containsIndex(i), i === 1);
                assert.deepStrictEqual(unrecognizedElement.getContainingName(i), undefined);
            }

            assert.deepStrictEqual(unrecognizedElement.getChildElements().toArray(), []);
        });

        test(`with "<apples><and><bananas/></and></apples>"`, () => {
            const xmlElement = parseXmlElement("<apples><and><bananas/></and></apples>")
            const unrecognizedElement = new msbuild.UnrecognizedElement(xmlElement);
            assert.deepStrictEqual(unrecognizedElement.attributes.toArray(), []);
            assert.deepStrictEqual(unrecognizedElement.names.toArray(), [parseXmlName("apples", 1), parseXmlName("apples", 31)]);
            assert.deepStrictEqual(unrecognizedElement.span, new qub.Span(0, 38));
            assert.deepStrictEqual(unrecognizedElement.type, msbuild.ElementType.Unrecognized);

            for (let i = -1; i <= 3; ++i) {
                let expectedName: xml.Name = undefined;
                if (xmlElement.startTag && xmlElement.startTag.getName() && xmlElement.startTag.getName().containsIndex(i)) {
                    expectedName = xmlElement.startTag.getName();
                }
                else if (xmlElement.endTag && xmlElement.endTag.name && xmlElement.endTag.name.containsIndex(i)) {
                    expectedName = xmlElement.endTag.name;
                }
                assert.deepStrictEqual(unrecognizedElement.getContainingName(i), expectedName);
            }

            assert.deepStrictEqual(unrecognizedElement.getChildElements().toArray(), []);
        });
    });

    suite("validateElement()", () => {
        function validateElementTest(elementType: msbuild.ElementType, elementText: string, expectedIssues: qub.Issue[] = []): void {
            test(`with ${qub.escapeAndQuote(elementText)}`, () => {
                const issues = new qub.ArrayList<qub.Issue>();
                msbuild.validateElement(elementType, parseXmlElement(elementText), issues);
                assert.deepStrictEqual(issues.toArray(), expectedIssues);
            });
        }

        validateElementTest(msbuild.ElementType.Choose, `<Choose><When Condition=""/><Otherwise/><Otherwise></Otherwise></Choose>`, [
            msbuild.Issues.invalidLastChildElement("Choose", "Otherwise", new qub.Span(28, 12)),
            msbuild.Issues.atMostOneChildElement("Choose", "Otherwise", new qub.Span(40, 23))
        ]);
    });

    suite("validateChoose()", () => {
        function validateChooseTest(elementText: string, expectedIssues: qub.Issue[]): void {
            test(`with ${qub.escapeAndQuote(elementText)}`, () => {
                const issues = new qub.ArrayList<qub.Issue>();
                msbuild.validateChoose(parseXmlElement(elementText), issues);
                assert.deepStrictEqual(issues.toArray(), expectedIssues);
            });
        }

        validateChooseTest(`<Choose></Choose>`, [
            msbuild.Issues.missingRequiredChildElement("Choose", "When", new qub.Span(1, 6))
        ]);
        validateChooseTest(`<Choose SPAM=""></Choose>`, [
            msbuild.Issues.invalidAttribute("Choose", "SPAM", new qub.Span(8, 7)),
            msbuild.Issues.missingRequiredChildElement("Choose", "When", new qub.Span(1, 6))
        ]);

        validateChooseTest(`<Choose>    </Choose>`, [
            msbuild.Issues.missingRequiredChildElement("Choose", "When", new qub.Span(1, 6))
        ]);
        validateChooseTest(`<Choose> a b c </Choose>`, [
            msbuild.Issues.noTextSegmentsAllowed("Choose", new qub.Span(9, 5)),
            msbuild.Issues.missingRequiredChildElement("Choose", "When", new qub.Span(1, 6))
        ]);
        validateChooseTest(`<Choose>\na\nb\nc\n</Choose>`, [
            msbuild.Issues.noTextSegmentsAllowed("Choose", new qub.Span(9, 1)),
            msbuild.Issues.noTextSegmentsAllowed("Choose", new qub.Span(11, 1)),
            msbuild.Issues.noTextSegmentsAllowed("Choose", new qub.Span(13, 1)),
            msbuild.Issues.missingRequiredChildElement("Choose", "When", new qub.Span(1, 6))
        ]);

        validateChooseTest(`<Choose><SPAM/></Choose>`, [
            msbuild.Issues.invalidChildElement("Choose", "SPAM", new qub.Span(8, 7)),
            msbuild.Issues.missingRequiredChildElement("Choose", "When", new qub.Span(1, 6))
        ]);
        validateChooseTest(`<Choose><When/></Choose>`, [
            msbuild.Issues.missingRequiredAttribute("Condition", new qub.Span(9, 4))
        ]);
        validateChooseTest(`<Choose><When/><When/><When/></Choose>`, [
            msbuild.Issues.missingRequiredAttribute("Condition", new qub.Span(9, 4)),
            msbuild.Issues.missingRequiredAttribute("Condition", new qub.Span(16, 4)),
            msbuild.Issues.missingRequiredAttribute("Condition", new qub.Span(23, 4))
        ]);
        validateChooseTest(`<Choose><When/><When/><When/><Otherwise/></Choose>`, [
            msbuild.Issues.missingRequiredAttribute("Condition", new qub.Span(9, 4)),
            msbuild.Issues.missingRequiredAttribute("Condition", new qub.Span(16, 4)),
            msbuild.Issues.missingRequiredAttribute("Condition", new qub.Span(23, 4))
        ]);
        validateChooseTest(`<Choose><When/><When/><When/><Otherwise/><Otherwise/></Choose>`, [
            msbuild.Issues.missingRequiredAttribute("Condition", new qub.Span(9, 4)),
            msbuild.Issues.missingRequiredAttribute("Condition", new qub.Span(16, 4)),
            msbuild.Issues.missingRequiredAttribute("Condition", new qub.Span(23, 4)),
            msbuild.Issues.invalidLastChildElement("Choose", "Otherwise", new qub.Span(29, 12)),
            msbuild.Issues.atMostOneChildElement("Choose", "Otherwise", new qub.Span(41, 12))
        ]);
    });

    suite("validateImport()", () => {
        function validateImportTest(elementText: string, expectedIssues: qub.Issue[]): void {
            test(`with ${qub.escapeAndQuote(elementText)}`, () => {
                const issues = new qub.ArrayList<qub.Issue>();
                msbuild.validateImport(parseXmlElement(elementText), issues);
                assert.deepStrictEqual(issues.toArray(), expectedIssues);
            });
        }

        validateImportTest(`<Import></Import>`, [
            msbuild.Issues.missingRequiredAttribute("Project", new qub.Span(1, 6))
        ]);
        validateImportTest(`<Import Project=""></Import>`, []);
        validateImportTest(`<Import Project="test"></Import>`, []);
        validateImportTest(`<Import Project="$"></Import>`, []);
        validateImportTest(`<Import Project="$("></Import>`, [
            msbuild.Issues.missingPropertyName(new qub.Span(18, 1)),
            msbuild.Issues.missingRightParenthesis(new qub.Span(18, 1))
        ]);
        validateImportTest(`<Import Project="$(test"></Import>`, [
            msbuild.Issues.missingRightParenthesis(new qub.Span(18, 1))
        ]);
        validateImportTest(`<Import Project="$()"></Import>`, [
            msbuild.Issues.expectedPropertyName(new qub.Span(19, 1))
        ]);
        validateImportTest(`<Import Project="$(test)"></Import>`, []);
        validateImportTest(`<Import Project="$(te*st)"></Import>`, [
            msbuild.Issues.invalidPropertyNameCharacter("*", new qub.Span(21, 1))
        ]);
        validateImportTest(`<Import Project="" Condition=""></Import>`, []);
        validateImportTest(`<Import Project="" SPAM=""></Import>`, [
            msbuild.Issues.invalidAttribute("Import", "SPAM", new qub.Span(19, 7))
        ]);

        validateImportTest(`<Import Project="">    </Import>`, []);
        validateImportTest(`<Import Project=""> a b c </Import>`, [
            msbuild.Issues.noTextSegmentsAllowed("Import", new qub.Span(20, 5))
        ]);
        validateImportTest(`<Import Project="">\na\nb\nc\n</Import>`, [
            msbuild.Issues.noTextSegmentsAllowed("Import", new qub.Span(20, 1)),
            msbuild.Issues.noTextSegmentsAllowed("Import", new qub.Span(22, 1)),
            msbuild.Issues.noTextSegmentsAllowed("Import", new qub.Span(24, 1))
        ]);

        validateImportTest(`<Import Project=""><SPAM/></Import>`, [
            msbuild.Issues.invalidChildElement("Import", "SPAM", new qub.Span(19, 7))
        ]);
    });

    suite("validateImportGroup()", () => {
        function validateImportGroupTest(elementText: string, expectedIssues: qub.Issue[]): void {
            test(`with ${qub.escapeAndQuote(elementText)}`, () => {
                const issues = new qub.ArrayList<qub.Issue>();
                msbuild.validateImportGroup(parseXmlElement(elementText), issues);
                assert.deepStrictEqual(issues.toArray(), expectedIssues);
            });
        }

        validateImportGroupTest(`<ImportGroup></ImportGroup>`, []);
        validateImportGroupTest(`<ImportGroup Condition=""></ImportGroup>`, []);
        validateImportGroupTest(`<ImportGroup SPAM=""></ImportGroup>`, [
            msbuild.Issues.invalidAttribute("ImportGroup", "SPAM", new qub.Span(13, 7))
        ]);

        validateImportGroupTest(`<ImportGroup>    </ImportGroup>`, []);
        validateImportGroupTest(`<ImportGroup> a b c </ImportGroup>`, [
            msbuild.Issues.noTextSegmentsAllowed("ImportGroup", new qub.Span(14, 5))
        ]);
        validateImportGroupTest(`<ImportGroup>\na\nb\nc\n</ImportGroup>`, [
            msbuild.Issues.noTextSegmentsAllowed("ImportGroup", new qub.Span(14, 1)),
            msbuild.Issues.noTextSegmentsAllowed("ImportGroup", new qub.Span(16, 1)),
            msbuild.Issues.noTextSegmentsAllowed("ImportGroup", new qub.Span(18, 1))
        ]);

        validateImportGroupTest(`<ImportGroup><Import Project=""/></ImportGroup>`, []);
        validateImportGroupTest(`<ImportGroup><SPAM/></ImportGroup>`, [
            msbuild.Issues.invalidChildElement("ImportGroup", "SPAM", new qub.Span(13, 7))
        ]);
    });

    suite("validateItem()", () => {
        function validateItemTest(elementText: string, expectedIssues: qub.Issue[]): void {
            test(`with ${qub.escapeAndQuote(elementText)}`, () => {
                const issues = new qub.ArrayList<qub.Issue>();
                msbuild.validateItem(parseXmlElement(elementText), issues);
                assert.deepStrictEqual(issues.toArray(), expectedIssues);
            });
        }

        validateItemTest(`<Compile></Compile>`, [
            msbuild.Issues.missingRequiredAttribute("Include", new qub.Span(1, 7))
        ]);
        validateItemTest(`<Compile Include=""></Compile>`, []);
        validateItemTest(`<Compile Include="" Exclude=""></Compile>`, []);
        validateItemTest(`<Compile Include="" Condition=""></Compile>`, []);
        validateItemTest(`<Compile Include="" Remove=""></Compile>`, []);
        validateItemTest(`<Compile Include="" KeepMetadata=""></Compile>`, []);
        validateItemTest(`<Compile Include="" RemoveMetadata=""></Compile>`, []);
        validateItemTest(`<Compile Include="" KeepDuplicates=""></Compile>`, []);
        validateItemTest(`<Compile Include="" SPAM=""></Compile>`, [
            msbuild.Issues.invalidAttribute("Item", "SPAM", new qub.Span(20, 7))
        ]);

        validateItemTest(`<Compile Include="">    </Compile>`, []);
        validateItemTest(`<Compile Include=""> a b c </Compile>`, [
            msbuild.Issues.noTextSegmentsAllowed("Item", new qub.Span(21, 5))
        ]);
        validateItemTest(`<Compile Include="">\na\nb\nc\n</Compile>`, [
            msbuild.Issues.noTextSegmentsAllowed("Item", new qub.Span(21, 1)),
            msbuild.Issues.noTextSegmentsAllowed("Item", new qub.Span(23, 1)),
            msbuild.Issues.noTextSegmentsAllowed("Item", new qub.Span(25, 1))
        ]);

        validateItemTest(`<Compile Include=""><Private/></Compile>`, []);
        validateItemTest(`<Compile Include=""><SPAM/></Compile>`, []);
    });

    suite("validateItemDefinitionGroup()", () => {
        function validateItemDefinitionGroupTest(elementText: string, expectedIssues: qub.Issue[]): void {
            test(`with ${qub.escapeAndQuote(elementText)}`, () => {
                const issues = new qub.ArrayList<qub.Issue>();
                msbuild.validateItemDefinitionGroup(parseXmlElement(elementText), issues);
                assert.deepStrictEqual(issues.toArray(), expectedIssues);
            });
        }

        validateItemDefinitionGroupTest(`<ItemDefinitionGroup></ItemDefinitionGroup>`, []);
        validateItemDefinitionGroupTest(`<ItemDefinitionGroup Condition=""></ItemDefinitionGroup>`, []);
        validateItemDefinitionGroupTest(`<ItemDefinitionGroup SPAM=""></ItemDefinitionGroup>`, [
            msbuild.Issues.invalidAttribute("ItemDefinitionGroup", "SPAM", new qub.Span(21, 7))
        ]);

        validateItemDefinitionGroupTest(`<ItemDefinitionGroup>    </ItemDefinitionGroup>`, []);
        validateItemDefinitionGroupTest(`<ItemDefinitionGroup> a b c </ItemDefinitionGroup>`, [
            msbuild.Issues.noTextSegmentsAllowed("ItemDefinitionGroup", new qub.Span(22, 5))
        ]);
        validateItemDefinitionGroupTest(`<ItemDefinitionGroup>\na\nb\nc\n</ItemDefinitionGroup>`, [
            msbuild.Issues.noTextSegmentsAllowed("ItemDefinitionGroup", new qub.Span(22, 1)),
            msbuild.Issues.noTextSegmentsAllowed("ItemDefinitionGroup", new qub.Span(24, 1)),
            msbuild.Issues.noTextSegmentsAllowed("ItemDefinitionGroup", new qub.Span(26, 1))
        ]);

        validateItemDefinitionGroupTest(`<ItemDefinitionGroup><Private/></ItemDefinitionGroup>`, [
            msbuild.Issues.missingRequiredAttribute("Include", new qub.Span(22, 7))
        ]);
        validateItemDefinitionGroupTest(`<ItemDefinitionGroup><SPAM/></ItemDefinitionGroup>`, [
            msbuild.Issues.missingRequiredAttribute("Include", new qub.Span(22, 4))
        ]);
    });

    suite("validateItemGroup()", () => {
        function validateItemGroupTest(elementText: string, expectedIssues: qub.Issue[]): void {
            test(`with ${qub.escapeAndQuote(elementText)}`, () => {
                const issues = new qub.ArrayList<qub.Issue>();
                msbuild.validateItemGroup(parseXmlElement(elementText), issues);
                assert.deepStrictEqual(issues.toArray(), expectedIssues);
            });
        }

        validateItemGroupTest(`<ItemGroup></ItemGroup>`, []);
        validateItemGroupTest(`<ItemGroup Condition=""></ItemGroup>`, []);
        validateItemGroupTest(`<ItemGroup Label=""></ItemGroup>`, []);
        validateItemGroupTest(`<ItemGroup SPAM=""></ItemGroup>`, [
            msbuild.Issues.invalidAttribute("ItemGroup", "SPAM", new qub.Span(11, 7))
        ]);

        validateItemGroupTest(`<ItemGroup>    </ItemGroup>`, []);
        validateItemGroupTest(`<ItemGroup> a b c </ItemGroup>`, [
            msbuild.Issues.noTextSegmentsAllowed("ItemGroup", new qub.Span(12, 5))
        ]);
        validateItemGroupTest(`<ItemGroup>\na\nb\nc\n</ItemGroup>`, [
            msbuild.Issues.noTextSegmentsAllowed("ItemGroup", new qub.Span(12, 1)),
            msbuild.Issues.noTextSegmentsAllowed("ItemGroup", new qub.Span(14, 1)),
            msbuild.Issues.noTextSegmentsAllowed("ItemGroup", new qub.Span(16, 1))
        ]);

        validateItemGroupTest(`<ItemGroup><Private/></ItemGroup>`, [
            msbuild.Issues.missingRequiredAttribute("Include", new qub.Span(12, 7))
        ]);
        validateItemGroupTest(`<ItemGroup><SPAM/></ItemGroup>`, [
            msbuild.Issues.missingRequiredAttribute("Include", new qub.Span(12, 4))
        ]);
    });

    suite("validateItemMetadata()", () => {
        function validateItemMetadataTest(elementText: string, expectedIssues: qub.Issue[]): void {
            test(`with ${qub.escapeAndQuote(elementText)}`, () => {
                const issues = new qub.ArrayList<qub.Issue>();
                msbuild.validateItemMetadata(parseXmlElement(elementText), issues);
                assert.deepStrictEqual(issues.toArray(), expectedIssues);
            });
        }

        validateItemMetadataTest(`<SourcePath></SourcePath>`, []);
        validateItemMetadataTest(`<SourcePath Condition=""></SourcePath>`, []);
        validateItemMetadataTest(`<SourcePath SPAM=""></SourcePath>`, [
            msbuild.Issues.invalidAttribute("ItemMetadata", "SPAM", new qub.Span(12, 7))
        ]);

        validateItemMetadataTest(`<SourcePath>    </SourcePath>`, []);
        validateItemMetadataTest(`<SourcePath> a b c </SourcePath>`, []);
        validateItemMetadataTest(`<SourcePath>\na\nb\nc\n</SourcePath>`, []);
        validateItemMetadataTest(`<SourcePath>$(</SourcePath>`, [
            msbuild.Issues.missingPropertyName(new qub.Span(13, 1)),
            msbuild.Issues.missingRightParenthesis(new qub.Span(13, 1))
        ]);

        validateItemMetadataTest(`<SourcePath><Private/></SourcePath>`, [
            msbuild.Issues.invalidChildElement("ItemMetadata", "Private", new qub.Span(12, 10))
        ]);
        validateItemMetadataTest(`<SourcePath><SPAM/></SourcePath>`, [
            msbuild.Issues.invalidChildElement("ItemMetadata", "SPAM", new qub.Span(12, 7))
        ]);
    });

    suite("validateOnError()", () => {
        function validateOnErrorTest(elementText: string, expectedIssues: qub.Issue[]): void {
            test(`with ${qub.escapeAndQuote(elementText)}`, () => {
                const issues = new qub.ArrayList<qub.Issue>();
                msbuild.validateOnError(parseXmlElement(elementText), issues);
                assert.deepStrictEqual(issues.toArray(), expectedIssues);
            });
        }

        validateOnErrorTest(`<OnError></OnError>`, [
            msbuild.Issues.missingRequiredAttribute("ExecuteTargets", new qub.Span(1, 7))
        ]);
        validateOnErrorTest(`<OnError ExecuteTargets=""></OnError>`, []);
        validateOnErrorTest(`<OnError ExecuteTargets="" Condition=""></OnError>`, []);
        validateOnErrorTest(`<OnError ExecuteTargets="" SPAM=""></OnError>`, [
            msbuild.Issues.invalidAttribute("OnError", "SPAM", new qub.Span(27, 7))
        ]);

        validateOnErrorTest(`<OnError ExecuteTargets="">    </OnError>`, []);
        validateOnErrorTest(`<OnError ExecuteTargets=""> a b c </OnError>`, [
            msbuild.Issues.noTextSegmentsAllowed("OnError", new qub.Span(28, 5))
        ]);
        validateOnErrorTest(`<OnError ExecuteTargets="">\na\nb\nc\n</OnError>`, [
            msbuild.Issues.noTextSegmentsAllowed("OnError", new qub.Span(28, 1)),
            msbuild.Issues.noTextSegmentsAllowed("OnError", new qub.Span(30, 1)),
            msbuild.Issues.noTextSegmentsAllowed("OnError", new qub.Span(32, 1))
        ]);

        validateOnErrorTest(`<OnError ExecuteTargets=""><SPAM/></OnError>`, [
            msbuild.Issues.invalidChildElement("OnError", "SPAM", new qub.Span(27, 7))
        ]);
    });

    suite("validateOtherwise()", () => {
        function validateOtherwiseTest(elementText: string, expectedIssues: qub.Issue[]): void {
            test(`with ${qub.escapeAndQuote(elementText)}`, () => {
                const issues = new qub.ArrayList<qub.Issue>();
                msbuild.validateOtherwise(parseXmlElement(elementText), issues);
                assert.deepStrictEqual(issues.toArray(), expectedIssues);
            });
        }

        validateOtherwiseTest(`<Otherwise></Otherwise>`, []);
        validateOtherwiseTest(`<Otherwise SPAM=""></Otherwise>`, [
            msbuild.Issues.invalidAttribute("Otherwise", "SPAM", new qub.Span(11, 7))
        ]);

        validateOtherwiseTest(`<Otherwise>    </Otherwise>`, []);
        validateOtherwiseTest(`<Otherwise> a b c </Otherwise>`, [
            msbuild.Issues.noTextSegmentsAllowed("Otherwise", new qub.Span(12, 5))
        ]);
        validateOtherwiseTest(`<Otherwise>\na\nb\nc\n</Otherwise>`, [
            msbuild.Issues.noTextSegmentsAllowed("Otherwise", new qub.Span(12, 1)),
            msbuild.Issues.noTextSegmentsAllowed("Otherwise", new qub.Span(14, 1)),
            msbuild.Issues.noTextSegmentsAllowed("Otherwise", new qub.Span(16, 1))
        ]);

        validateOtherwiseTest(`<Otherwise><Choose/></Otherwise>`, [
            msbuild.Issues.missingRequiredChildElement("Choose", "When", new qub.Span(12, 6))
        ]);
        validateOtherwiseTest(`<Otherwise><PropertyGroup/></Otherwise>`, []);
        validateOtherwiseTest(`<Otherwise><ItemGroup/></Otherwise>`, []);
        validateOtherwiseTest(`<Otherwise><SPAM/></Otherwise>`, [
            msbuild.Issues.invalidChildElement("Otherwise", "SPAM", new qub.Span(11, 7))
        ]);
    });

    suite("validateOutput()", () => {
        function validateOutputTest(elementText: string, expectedIssues: qub.Issue[]): void {
            test(`with ${qub.escapeAndQuote(elementText)}`, () => {
                const issues = new qub.ArrayList<qub.Issue>();
                msbuild.validateOutput(parseXmlElement(elementText), issues);
                assert.deepStrictEqual(issues.toArray(), expectedIssues);
            });
        }

        validateOutputTest(`<Output></Output>`, [
            msbuild.Issues.missingRequiredAttribute("ItemName", new qub.Span(1, 6)),
            msbuild.Issues.missingRequiredAttribute("PropertyName", new qub.Span(1, 6)),
            msbuild.Issues.missingRequiredAttribute("TaskParameter", new qub.Span(1, 6))
        ]);
        validateOutputTest(`<Output ItemName=""></Output>`, [
            msbuild.Issues.missingRequiredAttribute("TaskParameter", new qub.Span(1, 6))
        ]);
        validateOutputTest(`<Output PropertyName=""></Output>`, [
            msbuild.Issues.missingRequiredAttribute("TaskParameter", new qub.Span(1, 6))
        ]);
        validateOutputTest(`<Output ItemName="" TaskParameter=""></Output>`, []);
        validateOutputTest(`<Output PropertyName="" TaskParameter=""></Output>`, []);
        validateOutputTest(`<Output ItemName="" PropertyName="" TaskParameter=""></Output>`, [
            msbuild.Issues.attributeCantBeDefinedWith("ItemName", "PropertyName", new qub.Span(8, 8)),
            msbuild.Issues.attributeCantBeDefinedWith("PropertyName", "ItemName", new qub.Span(20, 12))
        ]);
        validateOutputTest(`<Output SPAM=""></Output>`, [
            msbuild.Issues.invalidAttribute("Output", "SPAM", new qub.Span(8, 7)),
            msbuild.Issues.missingRequiredAttribute("ItemName", new qub.Span(1, 6)),
            msbuild.Issues.missingRequiredAttribute("PropertyName", new qub.Span(1, 6)),
            msbuild.Issues.missingRequiredAttribute("TaskParameter", new qub.Span(1, 6))
        ]);

        validateOutputTest(`<Output>    </Output>`, [
            msbuild.Issues.missingRequiredAttribute("ItemName", new qub.Span(1, 6)),
            msbuild.Issues.missingRequiredAttribute("PropertyName", new qub.Span(1, 6)),
            msbuild.Issues.missingRequiredAttribute("TaskParameter", new qub.Span(1, 6))
        ]);
        validateOutputTest(`<Output> a b c </Output>`, [
            msbuild.Issues.missingRequiredAttribute("ItemName", new qub.Span(1, 6)),
            msbuild.Issues.missingRequiredAttribute("PropertyName", new qub.Span(1, 6)),
            msbuild.Issues.missingRequiredAttribute("TaskParameter", new qub.Span(1, 6)),
            msbuild.Issues.noTextSegmentsAllowed("Output", new qub.Span(9, 5))
        ]);
        validateOutputTest(`<Output>\na\nb\nc\n</Output>`, [
            msbuild.Issues.missingRequiredAttribute("ItemName", new qub.Span(1, 6)),
            msbuild.Issues.missingRequiredAttribute("PropertyName", new qub.Span(1, 6)),
            msbuild.Issues.missingRequiredAttribute("TaskParameter", new qub.Span(1, 6)),
            msbuild.Issues.noTextSegmentsAllowed("Output", new qub.Span(9, 1)),
            msbuild.Issues.noTextSegmentsAllowed("Output", new qub.Span(11, 1)),
            msbuild.Issues.noTextSegmentsAllowed("Output", new qub.Span(13, 1))
        ]);

        validateOutputTest(`<Output><SPAM/></Output>`, [
            msbuild.Issues.missingRequiredAttribute("ItemName", new qub.Span(1, 6)),
            msbuild.Issues.missingRequiredAttribute("PropertyName", new qub.Span(1, 6)),
            msbuild.Issues.missingRequiredAttribute("TaskParameter", new qub.Span(1, 6)),
            msbuild.Issues.invalidChildElement("Output", "SPAM", new qub.Span(8, 7))
        ]);
    });

    suite("validateParameter()", () => {
        function validateParameterTest(elementText: string, expectedIssues: qub.Issue[]): void {
            test(`with ${qub.escapeAndQuote(elementText)}`, () => {
                const issues = new qub.ArrayList<qub.Issue>();
                msbuild.validateParameter(parseXmlElement(elementText), issues);
                assert.deepStrictEqual(issues.toArray(), expectedIssues);
            });
        }

        validateParameterTest(`<MyParam></MyParam>`, []);
        validateParameterTest(`<MyParam ParameterType=""></MyParam>`, []);
        validateParameterTest(`<MyParam Output=""></MyParam>`, []);
        validateParameterTest(`<MyParam Required=""></MyParam>`, []);
        validateParameterTest(`<MyParam SPAM=""></MyParam>`, [
            msbuild.Issues.invalidAttribute("Parameter", "SPAM", new qub.Span(9, 7))
        ]);

        validateParameterTest(`<MyParam>    </MyParam>`, []);
        validateParameterTest(`<MyParam> a b c </MyParam>`, [
            msbuild.Issues.noTextSegmentsAllowed("Parameter", new qub.Span(10, 5))
        ]);
        validateParameterTest(`<MyParam>\na\nb\nc\n</MyParam>`, [
            msbuild.Issues.noTextSegmentsAllowed("Parameter", new qub.Span(10, 1)),
            msbuild.Issues.noTextSegmentsAllowed("Parameter", new qub.Span(12, 1)),
            msbuild.Issues.noTextSegmentsAllowed("Parameter", new qub.Span(14, 1))
        ]);

        validateParameterTest(`<MyParam><SPAM/></MyParam>`, [
            msbuild.Issues.invalidChildElement("Parameter", "SPAM", new qub.Span(9, 7))
        ]);
    });

    suite("validateParameterGroup()", () => {
        function validateParameterGroupTest(elementText: string, expectedIssues: qub.Issue[]): void {
            test(`with ${qub.escapeAndQuote(elementText)}`, () => {
                const issues = new qub.ArrayList<qub.Issue>();
                msbuild.validateParameterGroup(parseXmlElement(elementText), issues);
                assert.deepStrictEqual(issues.toArray(), expectedIssues);
            });
        }

        validateParameterGroupTest(`<ParameterGroup></ParameterGroup>`, []);
        validateParameterGroupTest(`<ParameterGroup SPAM=""></ParameterGroup>`, [
            msbuild.Issues.invalidAttribute("ParameterGroup", "SPAM", new qub.Span(16, 7))
        ]);

        validateParameterGroupTest(`<ParameterGroup>    </ParameterGroup>`, []);
        validateParameterGroupTest(`<ParameterGroup> a b c </ParameterGroup>`, [
            msbuild.Issues.noTextSegmentsAllowed("ParameterGroup", new qub.Span(17, 5))
        ]);
        validateParameterGroupTest(`<ParameterGroup>\na\nb\nc\n</ParameterGroup>`, [
            msbuild.Issues.noTextSegmentsAllowed("ParameterGroup", new qub.Span(17, 1)),
            msbuild.Issues.noTextSegmentsAllowed("ParameterGroup", new qub.Span(19, 1)),
            msbuild.Issues.noTextSegmentsAllowed("ParameterGroup", new qub.Span(21, 1))
        ]);

        validateParameterGroupTest(`<ParameterGroup><SPAM/></ParameterGroup>`, []);
    });

    suite("validateProject()", () => {
        function validateProjectTest(elementText: string, expectedIssues: qub.Issue[]): void {
            test(`with ${qub.escapeAndQuote(elementText)}`, () => {
                const issues = new qub.ArrayList<qub.Issue>();
                msbuild.validateProject(parseXmlElement(elementText), issues);
                assert.deepStrictEqual(issues.toArray(), expectedIssues);
            });
        }

        validateProjectTest(`<Project></Project>`, [
            msbuild.Issues.missingRequiredAttribute("Xmlns", new qub.Span(1, 7))
        ]);
        validateProjectTest(`<Project Xmlns="" DefaultTargets=""></Project>`, []);
        validateProjectTest(`<Project Xmlns="" InitialTargets=""></Project>`, []);
        validateProjectTest(`<Project Xmlns="" ToolsVersion=""></Project>`, []);
        validateProjectTest(`<Project Xmlns="" TreatAsLocalProperty=""></Project>`, []);
        validateProjectTest(`<Project Xmlns="" SPAM=""></Project>`, [
            msbuild.Issues.invalidAttribute("Project", "SPAM", new qub.Span(18, 7))
        ]);

        validateProjectTest(`<Project Xmlns="">    </Project>`, []);
        validateProjectTest(`<Project Xmlns=""> a b c </Project>`, [
            msbuild.Issues.noTextSegmentsAllowed("Project", new qub.Span(19, 5))
        ]);
        validateProjectTest(`<Project Xmlns="">\na\nb\nc\n</Project>`, [
            msbuild.Issues.noTextSegmentsAllowed("Project", new qub.Span(19, 1)),
            msbuild.Issues.noTextSegmentsAllowed("Project", new qub.Span(21, 1)),
            msbuild.Issues.noTextSegmentsAllowed("Project", new qub.Span(23, 1))
        ]);

        validateProjectTest(`<Project Xmlns=""><Choose/></Project>`, [
            msbuild.Issues.missingRequiredChildElement("Choose", "When", new qub.Span(19, 6))
        ]);
        validateProjectTest(`<Project Xmlns=""><Import/></Project>`, [
            msbuild.Issues.missingRequiredAttribute("Project", new qub.Span(19, 6))
        ]);
        validateProjectTest(`<Project Xmlns=""><ImportGroup/></Project>`, []);
        validateProjectTest(`<Project Xmlns=""><ItemDefinitionGroup/></Project>`, []);
        validateProjectTest(`<Project Xmlns=""><ItemGroup/></Project>`, []);
        validateProjectTest(`<Project Xmlns=""><ProjectExtensions/></Project>`, []);
        validateProjectTest(`<Project Xmlns=""><ProjectExtensions/><ProjectExtensions/></Project>`, [
            msbuild.Issues.atMostOneChildElement("Project", "ProjectExtensions", new qub.Span(38, 20))
        ]);
        validateProjectTest(`<Project Xmlns=""><PropertyGroup/></Project>`, []);
        validateProjectTest(`<Project Xmlns=""><Target/></Project>`, [
            msbuild.Issues.missingRequiredAttribute("Name", new qub.Span(19, 6))
        ]);
        validateProjectTest(`<Project Xmlns=""><UsingTask/></Project>`, [
            msbuild.Issues.missingRequiredAttribute("AssemblyFile", new qub.Span(19, 9)),
            msbuild.Issues.missingRequiredAttribute("AssemblyName", new qub.Span(19, 9)),
            msbuild.Issues.missingRequiredAttribute("TaskName", new qub.Span(19, 9))
        ]);
        validateProjectTest(`<Project Xmlns=""><SPAM/></Project>`, [
            msbuild.Issues.invalidChildElement("Project", "SPAM", new qub.Span(18, 7))
        ]);
    });

    suite("validateProjectExtensions()", () => {
        function validateProjectExtensionsTest(elementText: string, expectedIssues: qub.Issue[]): void {
            test(`with ${qub.escapeAndQuote(elementText)}`, () => {
                const issues = new qub.ArrayList<qub.Issue>();
                msbuild.validateProjectExtensions(parseXmlElement(elementText), issues);
                assert.deepStrictEqual(issues.toArray(), expectedIssues);
            });
        }

        validateProjectExtensionsTest(`<ProjectExtensions></ProjectExtensions>`, []);
        validateProjectExtensionsTest(`<ProjectExtensions SPAM=""></ProjectExtensions>`, [
            msbuild.Issues.invalidAttribute("ProjectExtensions", "SPAM", new qub.Span(19, 7))
        ]);

        validateProjectExtensionsTest(`<ProjectExtensions>    </ProjectExtensions>`, []);
        validateProjectExtensionsTest(`<ProjectExtensions> a b c </ProjectExtensions>`, []);
        validateProjectExtensionsTest(`<ProjectExtensions>\na\nb\nc\n</ProjectExtensions>`, []);

        validateProjectExtensionsTest(`<ProjectExtensions><SPAM/></ProjectExtensions>`, []);
    });

    suite("validateProperty()", () => {
        function validatePropertyTest(elementText: string, expectedIssues: qub.Issue[]): void {
            test(`with ${qub.escapeAndQuote(elementText)}`, () => {
                const issues = new qub.ArrayList<qub.Issue>();
                msbuild.validateProperty(parseXmlElement(elementText), issues);
                assert.deepStrictEqual(issues.toArray(), expectedIssues);
            });
        }

        validatePropertyTest(`<MyProp></MyProp>`, []);
        validatePropertyTest(`<MyProp Condition=""></MyProp>`, []);
        validatePropertyTest(`<MyProp SPAM=""></MyProp>`, [
            msbuild.Issues.invalidAttribute("Property", "SPAM", new qub.Span(8, 7))
        ]);

        validatePropertyTest(`<MyProp>    </MyProp>`, []);
        validatePropertyTest(`<MyProp> a b c </MyProp>`, []);
        validatePropertyTest(`<MyProp>\na\nb\nc\n</MyProp>`, []);
        validatePropertyTest(`<MyProp>$()</MyProp>`, [
            msbuild.Issues.expectedPropertyName(new qub.Span(10, 1))
        ]);
        validatePropertyTest(`<MyProp>$(A)</MyProp>`, []);

        validatePropertyTest(`<MyProp><SPAM/></MyProp>`, [
            msbuild.Issues.invalidChildElement("Property", "SPAM", new qub.Span(8, 7))
        ]);
    });

    suite("validatePropertyGroup()", () => {
        function validatePropertyGroupTest(elementText: string, expectedIssues: qub.Issue[]): void {
            test(`with ${qub.escapeAndQuote(elementText)}`, () => {
                const issues = new qub.ArrayList<qub.Issue>();
                msbuild.validatePropertyGroup(parseXmlElement(elementText), issues);
                assert.deepStrictEqual(issues.toArray(), expectedIssues);
            });
        }

        validatePropertyGroupTest(`<PropertyGroup></PropertyGroup>`, []);
        validatePropertyGroupTest(`<PropertyGroup Condition=""></PropertyGroup>`, []);
        validatePropertyGroupTest(`<PropertyGroup Label=""></PropertyGroup>`, []);
        validatePropertyGroupTest(`<PropertyGroup SPAM=""></PropertyGroup>`, [
            msbuild.Issues.invalidAttribute("PropertyGroup", "SPAM", new qub.Span(15, 7))
        ]);

        validatePropertyGroupTest(`<PropertyGroup>    </PropertyGroup>`, []);
        validatePropertyGroupTest(`<PropertyGroup> a b c </PropertyGroup>`, [
            msbuild.Issues.noTextSegmentsAllowed("PropertyGroup", new qub.Span(16, 5))
        ]);
        validatePropertyGroupTest(`<PropertyGroup>\na\nb\nc\n</PropertyGroup>`, [
            msbuild.Issues.noTextSegmentsAllowed("PropertyGroup", new qub.Span(16, 1)),
            msbuild.Issues.noTextSegmentsAllowed("PropertyGroup", new qub.Span(18, 1)),
            msbuild.Issues.noTextSegmentsAllowed("PropertyGroup", new qub.Span(20, 1))
        ]);

        validatePropertyGroupTest(`<PropertyGroup><SPAM/></PropertyGroup>`, []);
    });

    suite("validateTarget()", () => {
        function validateTargetTest(elementText: string, expectedIssues: qub.Issue[]): void {
            test(`with ${qub.escapeAndQuote(elementText)}`, () => {
                const issues = new qub.ArrayList<qub.Issue>();
                msbuild.validateTarget(parseXmlElement(elementText), issues);
                assert.deepStrictEqual(issues.toArray(), expectedIssues);
            });
        }

        validateTargetTest(`<Target></Target>`, [
            msbuild.Issues.missingRequiredAttribute("Name", new qub.Span(1, 6))
        ]);
        validateTargetTest(`<Target Name=""></Target>`, []);
        validateTargetTest(`<Target Name="" AfterTargets=""></Target>`, []);
        validateTargetTest(`<Target Name="" BeforeTargets=""></Target>`, []);
        validateTargetTest(`<Target Name="" Condition=""></Target>`, []);
        validateTargetTest(`<Target Name="" DependsOnTargets=""></Target>`, []);
        validateTargetTest(`<Target Name="" Inputs=""></Target>`, []);
        validateTargetTest(`<Target Name="" KeepDuplicateOutputs=""></Target>`, []);
        validateTargetTest(`<Target Name="" Outputs=""></Target>`, []);
        validateTargetTest(`<Target Name="" Returns=""></Target>`, []);
        validateTargetTest(`<Target Name="" SPAM=""></Target>`, [
            msbuild.Issues.invalidAttribute("Target", "SPAM", new qub.Span(16, 7))
        ]);

        validateTargetTest(`<Target Name="">    </Target>`, []);
        validateTargetTest(`<Target Name=""> a b c </Target>`, [
            msbuild.Issues.noTextSegmentsAllowed("Target", new qub.Span(17, 5))
        ]);
        validateTargetTest(`<Target Name="">\na\nb\nc\n</Target>`, [
            msbuild.Issues.noTextSegmentsAllowed("Target", new qub.Span(17, 1)),
            msbuild.Issues.noTextSegmentsAllowed("Target", new qub.Span(19, 1)),
            msbuild.Issues.noTextSegmentsAllowed("Target", new qub.Span(21, 1))
        ]);

        validateTargetTest(`<Target Name=""><ItemGroup/></Target>`, []);
        validateTargetTest(`<Target Name=""><PropertyGroup/></Target>`, []);
        validateTargetTest(`<Target Name=""><OnError/></Target>`, [
            msbuild.Issues.missingRequiredAttribute("ExecuteTargets", new qub.Span(17, 7))
        ]);
        validateTargetTest(`<Target Name=""><OnError/><OnError/></Target>`, [
            msbuild.Issues.missingRequiredAttribute("ExecuteTargets", new qub.Span(17, 7)),
            msbuild.Issues.missingRequiredAttribute("ExecuteTargets", new qub.Span(27, 7)),
            msbuild.Issues.invalidLastChildElement("Target", "OnError", new qub.Span(16, 10)),
            msbuild.Issues.atMostOneChildElement("Target", "OnError", new qub.Span(26, 10))
        ]);
        validateTargetTest(`<Target Name=""><BscMake/></Target>`, []);
        validateTargetTest(`<Target Name=""><SPAM/></Target>`, []);
    });

    suite("validateTargetItem()", () => {
        function validateTargetItemTest(elementText: string, expectedIssues: qub.Issue[]): void {
            test(`with ${qub.escapeAndQuote(elementText)}`, () => {
                const issues = new qub.ArrayList<qub.Issue>();
                msbuild.validateTargetItem(parseXmlElement(elementText), issues);
                assert.deepStrictEqual(issues.toArray(), expectedIssues);
            });
        }

        validateTargetItemTest(`<Compile></Compile>`, [
            msbuild.Issues.missingRequiredAttribute("Include", new qub.Span(1, 7))
        ]);
        validateTargetItemTest(`<Compile Exclude=""></Compile>`, []);
        validateTargetItemTest(`<Compile Include=""></Compile>`, []);
        validateTargetItemTest(`<Compile Include="" Exclude=""></Compile>`, []);
        validateTargetItemTest(`<Compile Include="" Condition=""></Compile>`, []);
        validateTargetItemTest(`<Compile Include="" Remove=""></Compile>`, []);
        validateTargetItemTest(`<Compile Include="" KeepMetadata=""></Compile>`, []);
        validateTargetItemTest(`<Compile Include="" RemoveMetadata=""></Compile>`, []);
        validateTargetItemTest(`<Compile Include="" KeepDuplicates=""></Compile>`, []);
        validateTargetItemTest(`<Compile Include="" SPAM=""></Compile>`, [
            msbuild.Issues.invalidAttribute("Item", "SPAM", new qub.Span(20, 7))
        ]);

        validateTargetItemTest(`<Compile Include="">    </Compile>`, []);
        validateTargetItemTest(`<Compile Include=""> a b c </Compile>`, [
            msbuild.Issues.noTextSegmentsAllowed("Item", new qub.Span(21, 5))
        ]);
        validateTargetItemTest(`<Compile Include="">\na\nb\nc\n</Compile>`, [
            msbuild.Issues.noTextSegmentsAllowed("Item", new qub.Span(21, 1)),
            msbuild.Issues.noTextSegmentsAllowed("Item", new qub.Span(23, 1)),
            msbuild.Issues.noTextSegmentsAllowed("Item", new qub.Span(25, 1))
        ]);

        validateTargetItemTest(`<Compile Include=""><Private/></Compile>`, []);
        validateTargetItemTest(`<Compile Include=""><SPAM/></Compile>`, []);
    });

    suite("validateTargetItemGroup()", () => {
        function validateTargetItemGroupTest(elementText: string, expectedIssues: qub.Issue[]): void {
            test(`with ${qub.escapeAndQuote(elementText)}`, () => {
                const issues = new qub.ArrayList<qub.Issue>();
                msbuild.validateTargetItemGroup(parseXmlElement(elementText), issues);
                assert.deepStrictEqual(issues.toArray(), expectedIssues);
            });
        }

        validateTargetItemGroupTest(`<ItemGroup></ItemGroup>`, []);
        validateTargetItemGroupTest(`<ItemGroup Condition=""></ItemGroup>`, []);
        validateTargetItemGroupTest(`<ItemGroup Label=""></ItemGroup>`, []);
        validateTargetItemGroupTest(`<ItemGroup SPAM=""></ItemGroup>`, [
            msbuild.Issues.invalidAttribute("ItemGroup", "SPAM", new qub.Span(11, 7))
        ]);

        validateTargetItemGroupTest(`<ItemGroup>    </ItemGroup>`, []);
        validateTargetItemGroupTest(`<ItemGroup> a b c </ItemGroup>`, [
            msbuild.Issues.noTextSegmentsAllowed("ItemGroup", new qub.Span(12, 5))
        ]);
        validateTargetItemGroupTest(`<ItemGroup>\na\nb\nc\n</ItemGroup>`, [
            msbuild.Issues.noTextSegmentsAllowed("ItemGroup", new qub.Span(12, 1)),
            msbuild.Issues.noTextSegmentsAllowed("ItemGroup", new qub.Span(14, 1)),
            msbuild.Issues.noTextSegmentsAllowed("ItemGroup", new qub.Span(16, 1))
        ]);

        validateTargetItemGroupTest(`<ItemGroup><Private/></ItemGroup>`, [
            msbuild.Issues.missingRequiredAttribute("Include", new qub.Span(12, 7))
        ]);
        validateTargetItemGroupTest(`<ItemGroup><SPAM/></ItemGroup>`, [
            msbuild.Issues.missingRequiredAttribute("Include", new qub.Span(12, 4))
        ]);
    });

    suite("validateTask()", () => {
        function validateTaskTest(elementText: string, expectedIssues: qub.Issue[]): void {
            test(`with ${qub.escapeAndQuote(elementText)}`, () => {
                const issues = new qub.ArrayList<qub.Issue>();
                msbuild.validateTask(parseXmlElement(elementText), issues);
                assert.deepStrictEqual(issues.toArray(), expectedIssues);
            });
        }

        validateTaskTest(`<AL></AL>`, [
            msbuild.Issues.missingRequiredAttribute("OutputAssembly", new qub.Span(1, 2))
        ]);
        validateTaskTest(`<AL OutputAssembly=""></AL>`, []);
        validateTaskTest(`<AL OutputAssembly="$()"></AL>`, [
            msbuild.Issues.expectedPropertyName(new qub.Span(22, 1))
        ]);
        validateTaskTest(`<AL OutputAssembly="" AlgorithmID=""></AL>`, []);
        validateTaskTest(`<AL OutputAssembly="" BaseAddress=""></AL>`, []);
        validateTaskTest(`<AL OutputAssembly="" CompanyName=""></AL>`, []);
        validateTaskTest(`<AL OutputAssembly="" Configuration=""></AL>`, []);
        validateTaskTest(`<AL OutputAssembly="" Copyright=""></AL>`, []);
        validateTaskTest(`<AL OutputAssembly="" Culture=""></AL>`, []);
        validateTaskTest(`<AL OutputAssembly="" DelaySign=""></AL>`, []);
        validateTaskTest(`<AL OutputAssembly="" Description=""></AL>`, []);
        validateTaskTest(`<AL OutputAssembly="" EmbedResources=""></AL>`, []);
        validateTaskTest(`<AL OutputAssembly="" EvidenceFile=""></AL>`, []);
        validateTaskTest(`<AL OutputAssembly="" ExitCode=""></AL>`, []);
        validateTaskTest(`<AL OutputAssembly="" FileVersion=""></AL>`, []);
        validateTaskTest(`<AL OutputAssembly="" Flags=""></AL>`, []);
        validateTaskTest(`<AL OutputAssembly="" GenerateFullPaths=""></AL>`, []);
        validateTaskTest(`<AL OutputAssembly="" KeyContainer=""></AL>`, []);
        validateTaskTest(`<AL OutputAssembly="" KeyFile=""></AL>`, []);
        validateTaskTest(`<AL OutputAssembly="" LinkResources=""></AL>`, []);
        validateTaskTest(`<AL OutputAssembly="" MainEntryPoint=""></AL>`, []);
        validateTaskTest(`<AL OutputAssembly="" Platform=""></AL>`, []);
        validateTaskTest(`<AL OutputAssembly="" ProductName=""></AL>`, []);
        validateTaskTest(`<AL OutputAssembly="" ProductVersion=""></AL>`, []);
        validateTaskTest(`<AL OutputAssembly="" ResponseFiles=""></AL>`, []);
        validateTaskTest(`<AL OutputAssembly="" SdkToolsPath=""></AL>`, []);
        validateTaskTest(`<AL OutputAssembly="" SourceModules=""></AL>`, []);
        validateTaskTest(`<AL OutputAssembly="" TargetType=""></AL>`, []);
        validateTaskTest(`<AL OutputAssembly="" TemplateFile=""></AL>`, []);
        validateTaskTest(`<AL OutputAssembly="" Timeout=""></AL>`, []);
        validateTaskTest(`<AL OutputAssembly="" Title=""></AL>`, []);
        validateTaskTest(`<AL OutputAssembly="" Toolpath=""></AL>`, []);
        validateTaskTest(`<AL OutputAssembly="" Trademark=""></AL>`, []);
        validateTaskTest(`<AL OutputAssembly="" Version=""></AL>`, []);
        validateTaskTest(`<AL OutputAssembly="" Win32Icon=""></AL>`, []);
        validateTaskTest(`<AL OutputAssembly="" Win32Resource=""></AL>`, []);
        validateTaskTest(`<AL OutputAssembly="" SPAM=""></AL>`, [
            msbuild.Issues.invalidAttribute("AL", "SPAM", new qub.Span(22, 7))
        ]);

        validateTaskTest(`<AspNetCompiler></AspNetCompiler>`, []);
        validateTaskTest(`<AspNetCompiler AllowPartiallyTrustedCallers=""></AspNetCompiler>`, []);
        validateTaskTest(`<AspNetCompiler Clean=""></AspNetCompiler>`, []);
        validateTaskTest(`<AspNetCompiler Debug=""></AspNetCompiler>`, []);
        validateTaskTest(`<AspNetCompiler DelaySign=""></AspNetCompiler>`, []);
        validateTaskTest(`<AspNetCompiler FixedNames=""></AspNetCompiler>`, []);
        validateTaskTest(`<AspNetCompiler Force=""></AspNetCompiler>`, []);
        validateTaskTest(`<AspNetCompiler KeyContainer=""></AspNetCompiler>`, []);
        validateTaskTest(`<AspNetCompiler KeyFile=""></AspNetCompiler>`, []);
        validateTaskTest(`<AspNetCompiler MetabasePath=""></AspNetCompiler>`, []);
        validateTaskTest(`<AspNetCompiler PhysicalPath=""></AspNetCompiler>`, []);
        validateTaskTest(`<AspNetCompiler TargetFrameworkMoniker=""></AspNetCompiler>`, []);
        validateTaskTest(`<AspNetCompiler TargetPath=""></AspNetCompiler>`, []);
        validateTaskTest(`<AspNetCompiler Updateable=""></AspNetCompiler>`, []);
        validateTaskTest(`<AspNetCompiler VirtualPath=""></AspNetCompiler>`, []);
        validateTaskTest(`<AspNetCompiler SPAM=""></AspNetCompiler>`, [
            msbuild.Issues.invalidAttribute("AspNetCompiler", "SPAM", new qub.Span(16, 7))
        ]);

        validateTaskTest(`<AssignCulture></AssignCulture>`, [
            msbuild.Issues.missingRequiredAttribute("Files", new qub.Span(1, 13))
        ]);
        validateTaskTest(`<AssignCulture Files=""></AssignCulture>`, []);
        validateTaskTest(`<AssignCulture Files="" AssignedFiles=""></AssignCulture>`, []);
        validateTaskTest(`<AssignCulture Files="" AssignedFilesWithCulture=""></AssignCulture>`, []);
        validateTaskTest(`<AssignCulture Files="" AssignedFilesWithNoCulture=""></AssignCulture>`, []);
        validateTaskTest(`<AssignCulture Files="" CultureNeutralAssignedFiles=""></AssignCulture>`, []);
        validateTaskTest(`<AssignCulture Files="" SPAM=""></AssignCulture>`, [
            msbuild.Issues.invalidAttribute("AssignCulture", "SPAM", new qub.Span(24, 7))
        ]);

        validateTaskTest(`<AssignProjectConfiguration></AssignProjectConfiguration>`, []);
        validateTaskTest(`<AssignProjectConfiguration SolutionConfigurationContents=""></AssignProjectConfiguration >`, []);
        validateTaskTest(`<AssignProjectConfiguration DefaultToVcxPlatformMapping=""></AssignProjectConfiguration >`, []);
        validateTaskTest(`<AssignProjectConfiguration VcxToDefaultPlatformMapping=""></AssignProjectConfiguration >`, []);
        validateTaskTest(`<AssignProjectConfiguration CurrentProjectConfiguration=""></AssignProjectConfiguration >`, []);
        validateTaskTest(`<AssignProjectConfiguration CurrentProjectPlatform=""></AssignProjectConfiguration >`, []);
        validateTaskTest(`<AssignProjectConfiguration OnlyReferenceAndBuildProjectsEnabledInSolutionConfiguration=""></AssignProjectConfiguration >`, []);
        validateTaskTest(`<AssignProjectConfiguration ShouldUnsetParentConfigurationAndPlatform=""></AssignProjectConfiguration >`, []);
        validateTaskTest(`<AssignProjectConfiguration OutputType=""></AssignProjectConfiguration >`, []);
        validateTaskTest(`<AssignProjectConfiguration ResolveConfigurationPlatformUsingMappings=""></AssignProjectConfiguration >`, []);
        validateTaskTest(`<AssignProjectConfiguration AssignedProjects=""></AssignProjectConfiguration >`, []);
        validateTaskTest(`<AssignProjectConfiguration UnassignedProjects=""></AssignProjectConfiguration >`, []);
        validateTaskTest(`<AssignProjectConfiguration SPAM=""></AssignProjectConfiguration >`, [
            msbuild.Issues.invalidAttribute("AssignProjectConfiguration", "SPAM", new qub.Span(28, 7))
        ]);

        validateTaskTest(`<AssignTargetPath></AssignTargetPath>`, []);
        validateTaskTest(`<AssignTargetPath RootFolder=""></AssignTargetPath >`, []);
        validateTaskTest(`<AssignTargetPath Files=""></AssignTargetPath >`, []);
        validateTaskTest(`<AssignTargetPath AssignedFiles=""></AssignTargetPath >`, []);
        validateTaskTest(`<AssignTargetPath SPAM=""></AssignTargetPath >`, [
            msbuild.Issues.invalidAttribute("AssignTargetPath", "SPAM", new qub.Span(18, 7))
        ]);

        validateTaskTest(`<BscMake></BscMake>`, []);
        validateTaskTest(`<BscMake AdditionalOptions=""></BscMake>`, []);
        validateTaskTest(`<BscMake OutputFile=""></BscMake>`, []);
        validateTaskTest(`<BscMake PreserveSBR=""></BscMake>`, []);
        validateTaskTest(`<BscMake Sources=""></BscMake>`, []);
        validateTaskTest(`<BscMake SuppressStartupBanner=""></BscMake>`, []);
        validateTaskTest(`<BscMake TrackerLogDirectory=""></BscMake>`, []);
        validateTaskTest(`<BscMake SPAM=""></BscMake>`, [
            msbuild.Issues.invalidAttribute("BscMake", "SPAM", new qub.Span(9, 7))
        ]);

        validateTaskTest(`<CallTarget></CallTarget>`, []);
        validateTaskTest(`<CallTarget RunEachTargetSeparately=""></CallTarget >`, []);
        validateTaskTest(`<CallTarget TargetOutputs=""></CallTarget >`, []);
        validateTaskTest(`<CallTarget Targets=""></CallTarget >`, []);
        validateTaskTest(`<CallTarget UseResultsCache=""></CallTarget >`, []);
        validateTaskTest(`<CallTarget SPAM=""></CallTarget>`, [
            msbuild.Issues.invalidAttribute("CallTarget", "SPAM", new qub.Span(12, 7))
        ]);

        validateTaskTest(`<CL></CL>`, [
            msbuild.Issues.missingRequiredAttribute("Sources", new qub.Span(1, 2))
        ]);
        validateTaskTest(`<CL Sources=""></CL >`, []);
        validateTaskTest(`<CL Sources="" AdditionalIncludeDirectories=""></CL >`, []);
        validateTaskTest(`<CL Sources="" AdditionalOptions=""></CL >`, []);
        validateTaskTest(`<CL Sources="" AdditionalUsingDirectories=""></CL >`, []);
        validateTaskTest(`<CL Sources="" AlwaysAppend=""></CL >`, []);
        validateTaskTest(`<CL Sources="" AssemblerListingLocation=""></CL >`, []);
        validateTaskTest(`<CL Sources="" AssemblerOutput=""></CL >`, []);
        validateTaskTest(`<CL Sources="" BasicRuntimeChecks=""></CL >`, []);
        validateTaskTest(`<CL Sources="" BrowseInformation=""></CL >`, []);
        validateTaskTest(`<CL Sources="" BrowseInformationFile=""></CL >`, []);
        validateTaskTest(`<CL Sources="" BufferSecurityCheck=""></CL >`, []);
        validateTaskTest(`<CL Sources="" BuildingInIDE=""></CL >`, []);
        validateTaskTest(`<CL Sources="" CallingConvention=""></CL >`, []);
        validateTaskTest(`<CL Sources="" CompileAs=""></CL >`, []);
        validateTaskTest(`<CL Sources="" CompileAsManaged=""></CL >`, []);
        validateTaskTest(`<CL Sources="" CreateHotpatchableImage=""></CL >`, []);
        validateTaskTest(`<CL Sources="" DebugInformationFormat=""></CL >`, []);
        validateTaskTest(`<CL Sources="" DisableLanguageExtensions=""></CL >`, []);
        validateTaskTest(`<CL Sources="" DisableSpecificWarnings=""></CL >`, []);
        validateTaskTest(`<CL Sources="" EnableEnhancedInstructionSet=""></CL >`, []);
        validateTaskTest(`<CL Sources="" EnableFiberSafeOptimizations=""></CL >`, []);
        validateTaskTest(`<CL Sources="" EnablePREfast=""></CL >`, []);
        validateTaskTest(`<CL Sources="" ErrorReporting=""></CL >`, []);
        validateTaskTest(`<CL Sources="" ExceptionHandling=""></CL >`, []);
        validateTaskTest(`<CL Sources="" ExpandAttributedSource=""></CL >`, []);
        validateTaskTest(`<CL Sources="" FavorSizeOrSpeed=""></CL >`, []);
        validateTaskTest(`<CL Sources="" FloatingPointExceptions=""></CL >`, []);
        validateTaskTest(`<CL Sources="" FloatingPointModel=""></CL >`, []);
        validateTaskTest(`<CL Sources="" ForceConformanceInForLoopScope=""></CL >`, []);
        validateTaskTest(`<CL Sources="" ForcedIncludeFiles=""></CL >`, []);
        validateTaskTest(`<CL Sources="" ForcedUsingFiles=""></CL >`, []);
        validateTaskTest(`<CL Sources="" FunctionLevelLinking=""></CL >`, []);
        validateTaskTest(`<CL Sources="" GenerateXMLDocumentationFiles=""></CL >`, []);
        validateTaskTest(`<CL Sources="" IgnoreStandardIncludePath=""></CL >`, []);
        validateTaskTest(`<CL Sources="" InlineFunctionExpansion=""></CL >`, []);
        validateTaskTest(`<CL Sources="" IntrinsicFunctions=""></CL >`, []);
        validateTaskTest(`<CL Sources="" MinimalRebuild=""></CL >`, []);
        validateTaskTest(`<CL Sources="" MultiProcessorCompilation=""></CL >`, []);
        validateTaskTest(`<CL Sources="" ObjectFileName=""></CL >`, []);
        validateTaskTest(`<CL Sources="" ObjectFiles=""></CL >`, []);
        validateTaskTest(`<CL Sources="" OmitDefaultLibName=""></CL >`, []);
        validateTaskTest(`<CL Sources="" OmitFramePointers=""></CL >`, []);
        validateTaskTest(`<CL Sources="" OpenMPSupport=""></CL >`, []);
        validateTaskTest(`<CL Sources="" Optimization=""></CL >`, []);
        validateTaskTest(`<CL Sources="" PrecompiledHeader=""></CL >`, []);
        validateTaskTest(`<CL Sources="" PrecompiledHeaderFile=""></CL >`, []);
        validateTaskTest(`<CL Sources="" PrecompiledHeaderOutputFile=""></CL >`, []);
        validateTaskTest(`<CL Sources="" PreprocessKeepComments=""></CL >`, []);
        validateTaskTest(`<CL Sources="" PreprocessorDefinitions=""></CL >`, []);
        validateTaskTest(`<CL Sources="" PreprocessOutput=""></CL >`, []);
        validateTaskTest(`<CL Sources="" PreprocessOutputPath=""></CL >`, []);
        validateTaskTest(`<CL Sources="" PreprocessSuppressLineNumbers=""></CL >`, []);
        validateTaskTest(`<CL Sources="" PreprocessToFile=""></CL >`, []);
        validateTaskTest(`<CL Sources="" ProcessorNumber=""></CL >`, []);
        validateTaskTest(`<CL Sources="" ProgramDataBaseFileName=""></CL >`, []);
        validateTaskTest(`<CL Sources="" RuntimeLibrary=""></CL >`, []);
        validateTaskTest(`<CL Sources="" RuntimeTypeInfo=""></CL >`, []);
        validateTaskTest(`<CL Sources="" ShowIncludes=""></CL >`, []);
        validateTaskTest(`<CL Sources="" SmallerTypeCheck=""></CL >`, []);
        validateTaskTest(`<CL Sources="" StringPooling=""></CL >`, []);
        validateTaskTest(`<CL Sources="" StructMemberAlignment=""></CL >`, []);
        validateTaskTest(`<CL Sources="" SuppressStartupBanner=""></CL >`, []);
        validateTaskTest(`<CL Sources="" TrackerLogDirectory=""></CL >`, []);
        validateTaskTest(`<CL Sources="" TreatSpecificWarningsAsErrors=""></CL >`, []);
        validateTaskTest(`<CL Sources="" TreatWarningAsError=""></CL >`, []);
        validateTaskTest(`<CL Sources="" TreatWChar_tAsBuiltInType=""></CL >`, []);
        validateTaskTest(`<CL Sources="" UndefineAllPreprocessorDefinitions=""></CL >`, []);
        validateTaskTest(`<CL Sources="" UndefinePreprocessorDefinitions=""></CL >`, []);
        validateTaskTest(`<CL Sources="" UseFullPaths=""></CL >`, []);
        validateTaskTest(`<CL Sources="" UseUnicodeForAssemblerListing=""></CL >`, []);
        validateTaskTest(`<CL Sources="" WarningLevel=""></CL >`, []);
        validateTaskTest(`<CL Sources="" WholeProgramOptimization=""></CL >`, []);
        validateTaskTest(`<CL Sources="" XMLDocumentationFileName=""></CL >`, []);
        validateTaskTest(`<CL Sources="" MinimalRebuildFromTracking=""></CL >`, []);
        validateTaskTest(`<CL Sources="" TLogReadFiles=""></CL >`, []);
        validateTaskTest(`<CL Sources="" TLogWriteFiles=""></CL >`, []);
        validateTaskTest(`<CL Sources="" TrackFileAccess=""></CL >`, []);
        validateTaskTest(`<CL Sources="" SPAM=""></CL>`, [
            msbuild.Issues.invalidAttribute("CL", "SPAM", new qub.Span(15, 7))
        ]);

        validateTaskTest(`<CombinePath></CombinePath>`, [
            msbuild.Issues.missingRequiredAttribute("BasePath", new qub.Span(1, 11)),
            msbuild.Issues.missingRequiredAttribute("Paths", new qub.Span(1, 11))
        ]);
        validateTaskTest(`<CombinePath BasePath=""></CombinePath>`, [
            msbuild.Issues.missingRequiredAttribute("Paths", new qub.Span(1, 11))
        ]);
        validateTaskTest(`<CombinePath Paths=""></CombinePath>`, [
            msbuild.Issues.missingRequiredAttribute("BasePath", new qub.Span(1, 11))
        ]);
        validateTaskTest(`<CombinePath BasePath="" Paths=""></CombinePath>`, []);
        validateTaskTest(`<CombinePath BasePath="" Paths="" SPAM=""></CombinePath>`, [
            msbuild.Issues.invalidAttribute("CombinePath", "SPAM", new qub.Span(34, 7))
        ]);

        validateTaskTest(`<ConvertToAbsolutePath></ConvertToAbsolutePath>`, [
            msbuild.Issues.missingRequiredAttribute("Paths", new qub.Span(1, 21))
        ]);
        validateTaskTest(`<ConvertToAbsolutePath Paths=""></ConvertToAbsolutePath>`, []);
        validateTaskTest(`<ConvertToAbsolutePath Paths="" AbsolutePaths=""></ConvertToAbsolutePath>`, []);
        validateTaskTest(`<ConvertToAbsolutePath Paths="" SPAM=""></ConvertToAbsolutePath>`, [
            msbuild.Issues.invalidAttribute("ConvertToAbsolutePath", "SPAM", new qub.Span(32, 7))
        ]);

        validateTaskTest(`<Copy></Copy>`, [
            msbuild.Issues.missingRequiredAttribute("DestinationFiles", new qub.Span(1, 4)),
            msbuild.Issues.missingRequiredAttribute("DestinationFolder", new qub.Span(1, 4)),
            msbuild.Issues.missingRequiredAttribute(`SourceFiles`, new qub.Span(1, 4))
        ]);
        validateTaskTest(`<Copy DestinationFiles=""></Copy>`, [
            msbuild.Issues.missingRequiredAttribute(`SourceFiles`, new qub.Span(1, 4))
        ]);
        validateTaskTest(`<Copy DestinationFolder=""></Copy>`, [
            msbuild.Issues.missingRequiredAttribute("SourceFiles", new qub.Span(1, 4))
        ]);
        validateTaskTest(`<Copy DestinationFiles="" DestinationFolder=""></Copy>`, [
            msbuild.Issues.attributeCantBeDefinedWith("DestinationFiles", "DestinationFolder", new qub.Span(6, 16)),
            msbuild.Issues.attributeCantBeDefinedWith("DestinationFolder", "DestinationFiles", new qub.Span(26, 17)),
            msbuild.Issues.missingRequiredAttribute("SourceFiles", new qub.Span(1, 4))
        ]);
        validateTaskTest(`<Copy SourceFiles="" DestinationFiles=""></Copy>`, []);
        validateTaskTest(`<Copy SourceFiles="" DestinationFiles="" CopiedFiles=""></Copy>`, []);
        validateTaskTest(`<Copy SourceFiles="" DestinationFiles="" OverwriteReadOnlyFiles=""></Copy>`, []);
        validateTaskTest(`<Copy SourceFiles="" DestinationFiles="" Retries=""></Copy>`, []);
        validateTaskTest(`<Copy SourceFiles="" DestinationFiles="" RetryDelayMilliseconds=""></Copy>`, []);
        validateTaskTest(`<Copy SourceFiles="" DestinationFiles="" SkipUnchangedFiles=""></Copy>`, []);
        validateTaskTest(`<Copy SourceFiles="" DestinationFiles="" UseHardlinksIfPossible=""></Copy>`, []);
        validateTaskTest(`<Copy SourceFiles="" DestinationFiles="" SPAM=""></Copy>`, [
            msbuild.Issues.invalidAttribute("Copy", "SPAM", new qub.Span(41, 7))
        ]);

        validateTaskTest(`<CPPClean></CPPClean>`, [
            msbuild.Issues.missingRequiredAttribute("FilePatternsToDeleteOnClean", new qub.Span(1, 8)),
            msbuild.Issues.missingRequiredAttribute("FoldersToClean", new qub.Span(1, 8))
        ]);
        validateTaskTest(`<CPPClean FilePatternsToDeleteOnClean=""></CPPClean>`, [
            msbuild.Issues.missingRequiredAttribute("FoldersToClean", new qub.Span(1, 8))
        ]);
        validateTaskTest(`<CPPClean FoldersToClean=""></CPPClean>`, [
            msbuild.Issues.missingRequiredAttribute("FilePatternsToDeleteOnClean", new qub.Span(1, 8))
        ]);
        validateTaskTest(`<CPPClean FilePatternsToDeleteOnClean="" FoldersToClean=""></CPPClean>`, []);
        validateTaskTest(`<CPPClean FilePatternsToDeleteOnClean="" FoldersToClean="" DeletedFiles=""></CPPClean>`, []);
        validateTaskTest(`<CPPClean FilePatternsToDeleteOnClean="" FoldersToClean="" DoDelete=""></CPPClean>`, []);
        validateTaskTest(`<CPPClean FilePatternsToDeleteOnClean="" FoldersToClean="" FilesExcludedFromClean=""></CPPClean>`, []);
        validateTaskTest(`<CPPClean FilePatternsToDeleteOnClean="" FoldersToClean="" SPAM=""></CPPClean>`, [
            msbuild.Issues.invalidAttribute("CPPClean", "SPAM", new qub.Span(59, 7))
        ]);

        validateTaskTest(`<CreateCSharpManifestResourceName></CreateCSharpManifestResourceName>`, [
            msbuild.Issues.missingRequiredAttribute("ResourceFiles", new qub.Span(1, 32))
        ]);
        validateTaskTest(`<CreateCSharpManifestResourceName ResourceFiles=""></CreateCSharpManifestResourceName>`, []);
        validateTaskTest(`<CreateCSharpManifestResourceName ResourceFiles="" ManifestResourceNames=""></CreateCSharpManifestResourceName>`, []);
        validateTaskTest(`<CreateCSharpManifestResourceName ResourceFiles="" RootNamespace=""></CreateCSharpManifestResourceName>`, []);
        validateTaskTest(`<CreateCSharpManifestResourceName ResourceFiles="" PrependCultureAsDirectory=""></CreateCSharpManifestResourceName>`, []);
        validateTaskTest(`<CreateCSharpManifestResourceName ResourceFiles="" ResourceFilesWithManifestResourceNames=""></CreateCSharpManifestResourceName>`, []);
        validateTaskTest(`<CreateCSharpManifestResourceName ResourceFiles="" SPAM=""></CreateCSharpManifestResourceName>`, [
            msbuild.Issues.invalidAttribute("CreateCSharpManifestResourceName", "SPAM", new qub.Span(51, 7))
        ]);

        validateTaskTest(`<CreateItem></CreateItem>`, [
            msbuild.Issues.missingRequiredAttribute("Include", new qub.Span(1, 10))
        ]);
        validateTaskTest(`<CreateItem Include=""></CreateItem>`, []);
        validateTaskTest(`<CreateItem Include="" AdditionalMetadata=""></CreateItem>`, []);
        validateTaskTest(`<CreateItem Include="" Exclude=""></CreateItem>`, []);
        validateTaskTest(`<CreateItem Include="" PreserveExistingMetadata=""></CreateItem>`, []);
        validateTaskTest(`<CreateItem Include="" SPAM=""></CreateItem>`, [
            msbuild.Issues.invalidAttribute("CreateItem", "SPAM", new qub.Span(23, 7))
        ]);

        validateTaskTest(`<CreateProperty></CreateProperty>`, []);
        validateTaskTest(`<CreateProperty Value=""></CreateProperty>`, []);
        validateTaskTest(`<CreateProperty ValueSetByTask=""></CreateProperty>`, []);
        validateTaskTest(`<CreateProperty SPAM=""></CreateProperty>`, [
            msbuild.Issues.invalidAttribute("CreateProperty", "SPAM", new qub.Span(16, 7))
        ]);

        validateTaskTest(`<CreateVisualBasicManifestResourceName ></CreateVisualBasicManifestResourceName>`, [
            msbuild.Issues.missingRequiredAttribute("ResourceFiles", new qub.Span(1, 37))
        ]);
        validateTaskTest(`<CreateVisualBasicManifestResourceName ResourceFiles=""></CreateVisualBasicManifestResourceName>`, []);
        validateTaskTest(`<CreateVisualBasicManifestResourceName ResourceFiles="" ManifestResourceNames=""></CreateVisualBasicManifestResourceName>`, []);
        validateTaskTest(`<CreateVisualBasicManifestResourceName ResourceFiles="" RootNamespace=""></CreateVisualBasicManifestResourceName>`, []);
        validateTaskTest(`<CreateVisualBasicManifestResourceName ResourceFiles="" PrependCultureAsDirectory=""></CreateVisualBasicManifestResourceName>`, []);
        validateTaskTest(`<CreateVisualBasicManifestResourceName ResourceFiles="" ResourceFilesWithManifestResourceNames=""></CreateVisualBasicManifestResourceName>`, []);
        validateTaskTest(`<CreateVisualBasicManifestResourceName ResourceFiles="" SPAM=""></CreateVisualBasicManifestResourceName>`, [
            msbuild.Issues.invalidAttribute("CreateVisualBasicManifestResourceName", "SPAM", new qub.Span(56, 7))
        ]);

        validateTaskTest(`<Csc></Csc>`, []);
        validateTaskTest(`<Csc AdditionalLibPaths=""></Csc>`, []);
        validateTaskTest(`<Csc AddModules=""></Csc>`, []);
        validateTaskTest(`<Csc AllowUnsafeBlocks=""></Csc>`, []);
        validateTaskTest(`<Csc ApplicationConfiguration=""></Csc>`, []);
        validateTaskTest(`<Csc BaseAddress=""></Csc>`, []);
        validateTaskTest(`<Csc CheckForOverflowUnderflow=""></Csc>`, []);
        validateTaskTest(`<Csc CodePage=""></Csc>`, []);
        validateTaskTest(`<Csc DebugType=""></Csc>`, []);
        validateTaskTest(`<Csc DefineConstants=""></Csc>`, []);
        validateTaskTest(`<Csc DelaySign=""></Csc>`, []);
        validateTaskTest(`<Csc DisabledWarnings=""></Csc>`, []);
        validateTaskTest(`<Csc DocumentationFile=""></Csc>`, []);
        validateTaskTest(`<Csc EmitDebugInformation=""></Csc>`, []);
        validateTaskTest(`<Csc ErrorReport=""></Csc>`, []);
        validateTaskTest(`<Csc FileAlignment=""></Csc>`, []);
        validateTaskTest(`<Csc GenerateFullPaths=""></Csc>`, []);
        validateTaskTest(`<Csc KeyContainer=""></Csc>`, []);
        validateTaskTest(`<Csc KeyFile=""></Csc>`, []);
        validateTaskTest(`<Csc LangVersion=""></Csc>`, []);
        validateTaskTest(`<Csc LinkResources=""></Csc>`, []);
        validateTaskTest(`<Csc MainEntryPoint=""></Csc>`, []);
        validateTaskTest(`<Csc ModuleAssemblyName=""></Csc>`, []);
        validateTaskTest(`<Csc NoConfig=""></Csc>`, []);
        validateTaskTest(`<Csc NoLogo=""></Csc>`, []);
        validateTaskTest(`<Csc NoStandardLib=""></Csc>`, []);
        validateTaskTest(`<Csc NoWin32Manifest=""></Csc>`, []);
        validateTaskTest(`<Csc Optimize=""></Csc>`, []);
        validateTaskTest(`<Csc OutputAssembly=""></Csc>`, []);
        validateTaskTest(`<Csc PdbFile=""></Csc>`, []);
        validateTaskTest(`<Csc Platform=""></Csc>`, []);
        validateTaskTest(`<Csc References=""></Csc>`, []);
        validateTaskTest(`<Csc Resources=""></Csc>`, []);
        validateTaskTest(`<Csc ResponseFiles=""></Csc>`, []);
        validateTaskTest(`<Csc Sources=""></Csc>`, []);
        validateTaskTest(`<Csc TargetType=""></Csc>`, []);
        validateTaskTest(`<Csc TreatWarningsAsErrors=""></Csc>`, []);
        validateTaskTest(`<Csc UseHostCompilerIfAvailable=""></Csc>`, []);
        validateTaskTest(`<Csc Utf8Output=""></Csc>`, []);
        validateTaskTest(`<Csc WarningLevel=""></Csc>`, []);
        validateTaskTest(`<Csc WarningsAsErrors=""></Csc>`, []);
        validateTaskTest(`<Csc WarningsNotAsErrors=""></Csc>`, []);
        validateTaskTest(`<Csc Win32Icon=""></Csc>`, []);
        validateTaskTest(`<Csc Win32Manifest=""></Csc>`, []);
        validateTaskTest(`<Csc Win32Resource=""></Csc>`, []);
        validateTaskTest(`<Csc SPAM=""></Csc>`, [
            msbuild.Issues.invalidAttribute("Csc", "SPAM", new qub.Span(5, 7))
        ]);

        validateTaskTest(`<Delete></Delete>`, [
            msbuild.Issues.missingRequiredAttribute("Files", new qub.Span(1, 6))
        ]);
        validateTaskTest(`<Delete Files=""></Delete>`, []);
        validateTaskTest(`<Delete Files="" DeletedFiles=""></Delete>`, []);
        validateTaskTest(`<Delete Files="" TreatErrorsAsWarnings=""></Delete>`, []);
        validateTaskTest(`<Delete Files="" SPAM=""></Delete>`, [
            msbuild.Issues.invalidAttribute("Delete", "SPAM", new qub.Span(17, 7))
        ]);

        validateTaskTest(`<Error></Error>`, []);
        validateTaskTest(`<Error Code=""></Error>`, []);
        validateTaskTest(`<Error File=""></Error>`, []);
        validateTaskTest(`<Error HelpKeyword=""></Error>`, []);
        validateTaskTest(`<Error Text=""></Error>`, []);
        validateTaskTest(`<Error SPAM=""></Error>`, [
            msbuild.Issues.invalidAttribute("Error", "SPAM", new qub.Span(7, 7))
        ]);

        validateTaskTest(`<Exec></Exec>`, [
            msbuild.Issues.missingRequiredAttribute("Command", new qub.Span(1, 4))
        ]);
        validateTaskTest(`<Exec Command=""></Exec>`, []);
        validateTaskTest(`<Exec Command="" CustomErrorRegularExpression=""></Exec>`, []);
        validateTaskTest(`<Exec Command="" CustomWarningRegularExpression=""></Exec>`, []);
        validateTaskTest(`<Exec Command="" ExitCode=""></Exec>`, []);
        validateTaskTest(`<Exec Command="" IgnoreExitCode=""></Exec>`, []);
        validateTaskTest(`<Exec Command="" IgnoreStandardErrorWarningFormat=""></Exec>`, []);
        validateTaskTest(`<Exec Command="" Outputs=""></Exec>`, []);
        validateTaskTest(`<Exec Command="" StdErrEncoding=""></Exec>`, []);
        validateTaskTest(`<Exec Command="" StdOutEncoding=""></Exec>`, []);
        validateTaskTest(`<Exec Command="" WorkingDirectory=""></Exec>`, []);
        validateTaskTest(`<Exec Command="" SPAM=""></Exec>`, [
            msbuild.Issues.invalidAttribute("Exec", "SPAM", new qub.Span(17, 7))
        ]);

        validateTaskTest(`<FindAppConfigFile></FindAppConfigFile>`, [
            msbuild.Issues.missingRequiredAttribute("PrimaryList", new qub.Span(1, 17)),
            msbuild.Issues.missingRequiredAttribute("SecondaryList", new qub.Span(1, 17)),
            msbuild.Issues.missingRequiredAttribute("TargetPath", new qub.Span(1, 17))
        ]);
        validateTaskTest(`<FindAppConfigFile PrimaryList=""></FindAppConfigFile>`, [
            msbuild.Issues.missingRequiredAttribute("SecondaryList", new qub.Span(1, 17)),
            msbuild.Issues.missingRequiredAttribute("TargetPath", new qub.Span(1, 17))
        ]);
        validateTaskTest(`<FindAppConfigFile PrimaryList="" SecondaryList=""></FindAppConfigFile>`, [
            msbuild.Issues.missingRequiredAttribute("TargetPath", new qub.Span(1, 17))
        ]);
        validateTaskTest(`<FindAppConfigFile PrimaryList="" SecondaryList="" TargetPath=""></FindAppConfigFile>`, []);
        validateTaskTest(`<FindAppConfigFile PrimaryList="" SecondaryList="" TargetPath="" AppConfigFile=""></FindAppConfigFile>`, []);
        validateTaskTest(`<FindAppConfigFile PrimaryList="" SecondaryList="" TargetPath="" SPAM=""></FindAppConfigFile>`, [
            msbuild.Issues.invalidAttribute("FindAppConfigFile", "SPAM", new qub.Span(65, 7))
        ]);

        validateTaskTest(`<FindInList></FindInList>`, [
            msbuild.Issues.missingRequiredAttribute("ItemSpecToFind", new qub.Span(1, 10)),
            msbuild.Issues.missingRequiredAttribute("List", new qub.Span(1, 10))
        ]);
        validateTaskTest(`<FindInList ItemSpecToFind="" List=""></FindInList>`, []);
        validateTaskTest(`<FindInList ItemSpecToFind="" List="" CaseSensitive=""></FindInList>`, []);
        validateTaskTest(`<FindInList ItemSpecToFind="" List="" FindLastMatch=""></FindInList>`, []);
        validateTaskTest(`<FindInList ItemSpecToFind="" List="" ItemFound=""></FindInList>`, []);
        validateTaskTest(`<FindInList ItemSpecToFind="" List="" MatchFileNameOnly=""></FindInList>`, []);
        validateTaskTest(`<FindInList ItemSpecToFind="" List="" SPAM=""></FindInList>`, [
            msbuild.Issues.invalidAttribute("FindInList", "SPAM", new qub.Span(38, 7))
        ]);

        validateTaskTest(`<FindUnderPath></FindUnderPath>`, [
            msbuild.Issues.missingRequiredAttribute("Path", new qub.Span(1, 13))
        ]);
        validateTaskTest(`<FindUnderPath Path=""></FindUnderPath>`, []);
        validateTaskTest(`<FindUnderPath Path="" Files=""></FindUnderPath>`, []);
        validateTaskTest(`<FindUnderPath Path="" InPath=""></FindUnderPath>`, []);
        validateTaskTest(`<FindUnderPath Path="" OutOfPath=""></FindUnderPath>`, []);
        validateTaskTest(`<FindUnderPath Path="" UpdateToAbsolutePaths=""></FindUnderPath>`, []);
        validateTaskTest(`<FindUnderPath Path="" SPAM=""></FindUnderPath>`, [
            msbuild.Issues.invalidAttribute("FindUnderPath", "SPAM", new qub.Span(23, 7))
        ]);

        validateTaskTest(`<FormatUrl></FormatUrl>`, []);
        validateTaskTest(`<FormatUrl InputUrl=""></FormatUrl>`, []);
        validateTaskTest(`<FormatUrl OutputUrl=""></FormatUrl>`, []);
        validateTaskTest(`<FormatUrl SPAM=""></FormatUrl>`, [
            msbuild.Issues.invalidAttribute("FormatUrl", "SPAM", new qub.Span(11, 7))
        ]);

        validateTaskTest(`<FormatVersion></FormatVersion>`, []);
        validateTaskTest(`<FormatVersion FormatType=""></FormatVersion>`, []);
        validateTaskTest(`<FormatVersion OutputVersion=""></FormatVersion>`, []);
        validateTaskTest(`<FormatVersion Revision=""></FormatVersion>`, []);
        validateTaskTest(`<FormatVersion Version=""></FormatVersion>`, []);
        validateTaskTest(`<FormatVersion SPAM=""></FormatVersion>`, [
            msbuild.Issues.invalidAttribute("FormatVersion", "SPAM", new qub.Span(15, 7))
        ]);

        validateTaskTest(`<GenerateApplicationManifest></GenerateApplicationManifest>`, []);
        validateTaskTest(`<GenerateApplicationManifest AssemblyName=""></GenerateApplicationManifest>`, []);
        validateTaskTest(`<GenerateApplicationManifest AssemblyVersion=""></GenerateApplicationManifest>`, []);
        validateTaskTest(`<GenerateApplicationManifest ClrVersion=""></GenerateApplicationManifest>`, []);
        validateTaskTest(`<GenerateApplicationManifest ConfigFile=""></GenerateApplicationManifest>`, []);
        validateTaskTest(`<GenerateApplicationManifest Dependencies=""></GenerateApplicationManifest>`, []);
        validateTaskTest(`<GenerateApplicationManifest Description=""></GenerateApplicationManifest>`, []);
        validateTaskTest(`<GenerateApplicationManifest EntryPoint=""></GenerateApplicationManifest>`, []);
        validateTaskTest(`<GenerateApplicationManifest ErrorReportUrl=""></GenerateApplicationManifest>`, []);
        validateTaskTest(`<GenerateApplicationManifest FileAssociations=""></GenerateApplicationManifest>`, []);
        validateTaskTest(`<GenerateApplicationManifest Files=""></GenerateApplicationManifest>`, []);
        validateTaskTest(`<GenerateApplicationManifest HostInBrowser=""></GenerateApplicationManifest>`, []);
        validateTaskTest(`<GenerateApplicationManifest IconFile=""></GenerateApplicationManifest>`, []);
        validateTaskTest(`<GenerateApplicationManifest InputManifest=""></GenerateApplicationManifest>`, []);
        validateTaskTest(`<GenerateApplicationManifest IsolatedComReferences=""></GenerateApplicationManifest>`, []);
        validateTaskTest(`<GenerateApplicationManifest ManifestType=""></GenerateApplicationManifest>`, []);
        validateTaskTest(`<GenerateApplicationManifest MaxTargetPath=""></GenerateApplicationManifest>`, []);
        validateTaskTest(`<GenerateApplicationManifest OSVersion=""></GenerateApplicationManifest>`, []);
        validateTaskTest(`<GenerateApplicationManifest OutputManifest=""></GenerateApplicationManifest>`, []);
        validateTaskTest(`<GenerateApplicationManifest Platform=""></GenerateApplicationManifest>`, []);
        validateTaskTest(`<GenerateApplicationManifest Product=""></GenerateApplicationManifest>`, []);
        validateTaskTest(`<GenerateApplicationManifest Publisher=""></GenerateApplicationManifest>`, []);
        validateTaskTest(`<GenerateApplicationManifest RequiresMinimumFramework35SP1=""></GenerateApplicationManifest>`, []);
        validateTaskTest(`<GenerateApplicationManifest TargetCulture=""></GenerateApplicationManifest>`, []);
        validateTaskTest(`<GenerateApplicationManifest TargetFrameworkMoniker=""></GenerateApplicationManifest>`, []);
        validateTaskTest(`<GenerateApplicationManifest TargetFrameworkProfile=""></GenerateApplicationManifest>`, []);
        validateTaskTest(`<GenerateApplicationManifest TargetFrameworkSubset=""></GenerateApplicationManifest>`, []);
        validateTaskTest(`<GenerateApplicationManifest TargetFrameworkVersion=""></GenerateApplicationManifest>`, []);
        validateTaskTest(`<GenerateApplicationManifest TrustInfoFile=""></GenerateApplicationManifest>`, []);
        validateTaskTest(`<GenerateApplicationManifest UseApplicationTrust=""></GenerateApplicationManifest>`, []);
        validateTaskTest(`<GenerateApplicationManifest SPAM=""></GenerateApplicationManifest>`, [
            msbuild.Issues.invalidAttribute("GenerateApplicationManifest", "SPAM", new qub.Span(29, 7))
        ]);

        validateTaskTest(`<GenerateBootstrapper></GenerateBootstrapper>`, []);
        validateTaskTest(`<GenerateBootstrapper ApplicationFile=""></GenerateBootstrapper>`, []);
        validateTaskTest(`<GenerateBootstrapper ApplicationName=""></GenerateBootstrapper>`, []);
        validateTaskTest(`<GenerateBootstrapper ApplicationRequiresElevation=""></GenerateBootstrapper>`, []);
        validateTaskTest(`<GenerateBootstrapper ApplicationUrl=""></GenerateBootstrapper>`, []);
        validateTaskTest(`<GenerateBootstrapper BootstrapperComponentFiles=""></GenerateBootstrapper>`, []);
        validateTaskTest(`<GenerateBootstrapper BootstrapperItems=""></GenerateBootstrapper>`, []);
        validateTaskTest(`<GenerateBootstrapper BootstrapperKeyFile=""></GenerateBootstrapper>`, []);
        validateTaskTest(`<GenerateBootstrapper ComponentsLocation=""></GenerateBootstrapper>`, []);
        validateTaskTest(`<GenerateBootstrapper ComponentsUrl=""></GenerateBootstrapper>`, []);
        validateTaskTest(`<GenerateBootstrapper CopyComponents=""></GenerateBootstrapper>`, []);
        validateTaskTest(`<GenerateBootstrapper Culture=""></GenerateBootstrapper>`, []);
        validateTaskTest(`<GenerateBootstrapper FallbackCulture=""></GenerateBootstrapper>`, []);
        validateTaskTest(`<GenerateBootstrapper OutputPath=""></GenerateBootstrapper>`, []);
        validateTaskTest(`<GenerateBootstrapper Path=""></GenerateBootstrapper>`, []);
        validateTaskTest(`<GenerateBootstrapper SupportUrl=""></GenerateBootstrapper>`, []);
        validateTaskTest(`<GenerateBootstrapper Validate=""></GenerateBootstrapper>`, []);
        validateTaskTest(`<GenerateBootstrapper SPAM=""></GenerateBootstrapper>`, [
            msbuild.Issues.invalidAttribute("GenerateBootstrapper", "SPAM", new qub.Span(22, 7))
        ]);

        validateTaskTest(`<GenerateDeploymentManifest></GenerateDeploymentManifest>`, []);
        validateTaskTest(`<GenerateDeploymentManifest AssemblyName=""></GenerateDeploymentManifest>`, []);
        validateTaskTest(`<GenerateDeploymentManifest AssemblyVersion=""></GenerateDeploymentManifest>`, []);
        validateTaskTest(`<GenerateDeploymentManifest CreateDesktopShortcut=""></GenerateDeploymentManifest>`, []);
        validateTaskTest(`<GenerateDeploymentManifest DeploymentUrl=""></GenerateDeploymentManifest>`, []);
        validateTaskTest(`<GenerateDeploymentManifest Description=""></GenerateDeploymentManifest>`, []);
        validateTaskTest(`<GenerateDeploymentManifest DisallowUrlActivation=""></GenerateDeploymentManifest>`, []);
        validateTaskTest(`<GenerateDeploymentManifest EntryPoint=""></GenerateDeploymentManifest>`, []);
        validateTaskTest(`<GenerateDeploymentManifest ErrorReportUrl=""></GenerateDeploymentManifest>`, []);
        validateTaskTest(`<GenerateDeploymentManifest InputManifest=""></GenerateDeploymentManifest>`, []);
        validateTaskTest(`<GenerateDeploymentManifest Install=""></GenerateDeploymentManifest>`, []);
        validateTaskTest(`<GenerateDeploymentManifest MapFileExtensions=""></GenerateDeploymentManifest>`, []);
        validateTaskTest(`<GenerateDeploymentManifest MaxTargetPath=""></GenerateDeploymentManifest>`, []);
        validateTaskTest(`<GenerateDeploymentManifest MinimumRequiredVersion=""></GenerateDeploymentManifest>`, []);
        validateTaskTest(`<GenerateDeploymentManifest OutputManifest=""></GenerateDeploymentManifest>`, []);
        validateTaskTest(`<GenerateDeploymentManifest Platform=""></GenerateDeploymentManifest>`, []);
        validateTaskTest(`<GenerateDeploymentManifest Product=""></GenerateDeploymentManifest>`, []);
        validateTaskTest(`<GenerateDeploymentManifest Publisher=""></GenerateDeploymentManifest>`, []);
        validateTaskTest(`<GenerateDeploymentManifest SuiteNamel=""></GenerateDeploymentManifest>`, []);
        validateTaskTest(`<GenerateDeploymentManifest SupportUrl=""></GenerateDeploymentManifest>`, []);
        validateTaskTest(`<GenerateDeploymentManifest TargetCulture=""></GenerateDeploymentManifest>`, []);
        validateTaskTest(`<GenerateDeploymentManifest TrustUrlParameters=""></GenerateDeploymentManifest>`, []);
        validateTaskTest(`<GenerateDeploymentManifest UpdateEnabled=""></GenerateDeploymentManifest>`, []);
        validateTaskTest(`<GenerateDeploymentManifest UpdateInterval=""></GenerateDeploymentManifest>`, []);
        validateTaskTest(`<GenerateDeploymentManifest UpdateMode=""></GenerateDeploymentManifest>`, []);
        validateTaskTest(`<GenerateDeploymentManifest UpdateUnit=""></GenerateDeploymentManifest>`, []);
        validateTaskTest(`<GenerateDeploymentManifest SPAM=""></GenerateDeploymentManifest>`, [
            msbuild.Issues.invalidAttribute("GenerateDeploymentManifest", "SPAM", new qub.Span(28, 7))
        ]);

        validateTaskTest(`<GenerateResource></GenerateResource>`, [
            msbuild.Issues.missingRequiredAttribute("Sources", new qub.Span(1, 16))
        ]);
        validateTaskTest(`<GenerateResource Sources=""></GenerateResource>`, []);
        validateTaskTest(`<GenerateResource Sources="" AdditionalInputs=""></GenerateResource>`, []);
        validateTaskTest(`<GenerateResource Sources="" EnvironmentVariables=""></GenerateResource>`, []);
        validateTaskTest(`<GenerateResource Sources="" ExcludedInputPaths=""></GenerateResource>`, []);
        validateTaskTest(`<GenerateResource Sources="" ExecuteAsTool=""></GenerateResource>`, []);
        validateTaskTest(`<GenerateResource Sources="" FilesWritten=""></GenerateResource>`, []);
        validateTaskTest(`<GenerateResource Sources="" MinimalRebuildFromTracking=""></GenerateResource>`, []);
        validateTaskTest(`<GenerateResource Sources="" NeverLockTypeAssemblies=""></GenerateResource>`, []);
        validateTaskTest(`<GenerateResource Sources="" OutputResources=""></GenerateResource>`, []);
        validateTaskTest(`<GenerateResource Sources="" PublicClass=""></GenerateResource>`, []);
        validateTaskTest(`<GenerateResource Sources="" References=""></GenerateResource>`, []);
        validateTaskTest(`<GenerateResource Sources="" SdkToolsPath=""></GenerateResource>`, []);
        validateTaskTest(`<GenerateResource Sources="" StateFile=""></GenerateResource>`, []);
        validateTaskTest(`<GenerateResource Sources="" StronglyTypedClassName=""></GenerateResource>`, []);
        validateTaskTest(`<GenerateResource Sources="" StronglyTypedFilename=""></GenerateResource>`, []);
        validateTaskTest(`<GenerateResource Sources="" StronglyTypedLanguage=""></GenerateResource>`, []);
        validateTaskTest(`<GenerateResource Sources="" StronglyTypedManifestPrefix=""></GenerateResource>`, []);
        validateTaskTest(`<GenerateResource Sources="" StronglyTypedNamespace=""></GenerateResource>`, []);
        validateTaskTest(`<GenerateResource Sources="" TLogReadFiles=""></GenerateResource>`, []);
        validateTaskTest(`<GenerateResource Sources="" TLogWriteFiles=""></GenerateResource>`, []);
        validateTaskTest(`<GenerateResource Sources="" ToolArchitecture=""></GenerateResource>`, []);
        validateTaskTest(`<GenerateResource Sources="" TrackerFrameworkPath=""></GenerateResource>`, []);
        validateTaskTest(`<GenerateResource Sources="" TrackerLogDirectory=""></GenerateResource>`, []);
        validateTaskTest(`<GenerateResource Sources="" TrackerSdkPath=""></GenerateResource>`, []);
        validateTaskTest(`<GenerateResource Sources="" TrackFileAccess=""></GenerateResource>`, []);
        validateTaskTest(`<GenerateResource Sources="" UseSourcePath=""></GenerateResource>`, []);
        validateTaskTest(`<GenerateResource Sources="" SPAM=""></GenerateResource>`, [
            msbuild.Issues.invalidAttribute("GenerateResource", "SPAM", new qub.Span(29, 7))
        ]);

        validateTaskTest(`<GenerateTrustInfo></GenerateTrustInfo>`, [
            msbuild.Issues.missingRequiredAttribute("TrustInfoFile", new qub.Span(1, 17))
        ]);
        validateTaskTest(`<GenerateTrustInfo TrustInfoFile=""></GenerateTrustInfo>`, []);
        validateTaskTest(`<GenerateTrustInfo TrustInfoFile="" ApplicationDependencies=""></GenerateTrustInfo>`, []);
        validateTaskTest(`<GenerateTrustInfo TrustInfoFile="" BaseManifest=""></GenerateTrustInfo>`, []);
        validateTaskTest(`<GenerateTrustInfo TrustInfoFile="" ExcludedPermissions=""></GenerateTrustInfo>`, []);
        validateTaskTest(`<GenerateTrustInfo TrustInfoFile="" TargetZone=""></GenerateTrustInfo>`, []);
        validateTaskTest(`<GenerateTrustInfo TrustInfoFile="" SPAM=""></GenerateTrustInfo>`, [
            msbuild.Issues.invalidAttribute("GenerateTrustInfo", "SPAM", new qub.Span(36, 7))
        ]);

        validateTaskTest(`<GetAssemblyIdentity></GetAssemblyIdentity>`, [
            msbuild.Issues.missingRequiredAttribute("AssemblyFiles", new qub.Span(1, 19))
        ]);
        validateTaskTest(`<GetAssemblyIdentity AssemblyFiles=""></GetAssemblyIdentity>`, []);
        validateTaskTest(`<GetAssemblyIdentity AssemblyFiles="" Assemblies=""></GetAssemblyIdentity>`, []);
        validateTaskTest(`<GetAssemblyIdentity AssemblyFiles="" SPAM=""></GetAssemblyIdentity>`, [
            msbuild.Issues.invalidAttribute("GetAssemblyIdentity", "SPAM", new qub.Span(38, 7))
        ]);

        validateTaskTest(`<GetFrameworkPath></GetFrameworkPath>`, []);
        validateTaskTest(`<GetFrameworkPath FrameworkVersion11Path=""></GetFrameworkPath>`, []);
        validateTaskTest(`<GetFrameworkPath FrameworkVersion20Path=""></GetFrameworkPath>`, []);
        validateTaskTest(`<GetFrameworkPath FrameworkVersion30Path=""></GetFrameworkPath>`, []);
        validateTaskTest(`<GetFrameworkPath FrameworkVersion35Path=""></GetFrameworkPath>`, []);
        validateTaskTest(`<GetFrameworkPath FrameworkVersion40Path=""></GetFrameworkPath>`, []);
        validateTaskTest(`<GetFrameworkPath SPAM=""></GetFrameworkPath>`, [
            msbuild.Issues.invalidAttribute("GetFrameworkPath", "SPAM", new qub.Span(18, 7))
        ]);

        validateTaskTest(`<GetFrameworkSdkPath></GetFrameworkSdkPath>`, []);
        validateTaskTest(`<GetFrameworkSdkPath FrameworkSdkVersion20Path=""></GetFrameworkSdkPath>`, []);
        validateTaskTest(`<GetFrameworkSdkPath FrameworkSdkVersion35Path=""></GetFrameworkSdkPath>`, []);
        validateTaskTest(`<GetFrameworkSdkPath FrameworkSdkVersion40Path=""></GetFrameworkSdkPath>`, []);
        validateTaskTest(`<GetFrameworkSdkPath SPAM=""></GetFrameworkSdkPath>`, [
            msbuild.Issues.invalidAttribute("GetFrameworkSdkPath", "SPAM", new qub.Span(21, 7))
        ]);

        validateTaskTest(`<GetReferenceAssemblyPaths></GetReferenceAssemblyPaths>`, []);
        validateTaskTest(`<GetReferenceAssemblyPaths ReferenceAssemblyPaths=""></GetReferenceAssemblyPaths>`, []);
        validateTaskTest(`<GetReferenceAssemblyPaths FullFrameworkReferenceAssemblyPaths=""></GetReferenceAssemblyPaths>`, []);
        validateTaskTest(`<GetReferenceAssemblyPaths TargetFrameworkMoniker=""></GetReferenceAssemblyPaths>`, []);
        validateTaskTest(`<GetReferenceAssemblyPaths RootPath=""></GetReferenceAssemblyPaths>`, []);
        validateTaskTest(`<GetReferenceAssemblyPaths BypassFrameworkInstallChecks=""></GetReferenceAssemblyPaths>`, []);
        validateTaskTest(`<GetReferenceAssemblyPaths TargetFrameworkMonikerDisplayName=""></GetReferenceAssemblyPaths>`, []);
        validateTaskTest(`<GetReferenceAssemblyPaths SPAM=""></GetReferenceAssemblyPaths>`, [
            msbuild.Issues.invalidAttribute("GetReferenceAssemblyPaths", "SPAM", new qub.Span(27, 7))
        ]);

        validateTaskTest(`<LC></LC>`, [
            msbuild.Issues.missingRequiredAttribute("LicenseTarget", new qub.Span(1, 2)),
            msbuild.Issues.missingRequiredAttribute("Sources", new qub.Span(1, 2))
        ]);
        validateTaskTest(`<LC LicenseTarget="" Sources=""></LC>`, []);
        validateTaskTest(`<LC LicenseTarget="" Sources="" NoLogo=""></LC>`, []);
        validateTaskTest(`<LC LicenseTarget="" Sources="" OutputDirectory=""></LC>`, []);
        validateTaskTest(`<LC LicenseTarget="" Sources="" OutputLicense=""></LC>`, []);
        validateTaskTest(`<LC LicenseTarget="" Sources="" ReferencedAssemblies=""></LC>`, []);
        validateTaskTest(`<LC LicenseTarget="" Sources="" SdkToolsPath=""></LC>`, []);
        validateTaskTest(`<LC LicenseTarget="" Sources="" SPAM=""></LC>`, [
            msbuild.Issues.invalidAttribute("LC", "SPAM", new qub.Span(32, 7))
        ]);

        validateTaskTest(`<LIB></LIB>`, [
            msbuild.Issues.missingRequiredAttribute("Sources", new qub.Span(1, 3))
        ]);
        validateTaskTest(`<LIB Sources=""></LIB>`, []);
        validateTaskTest(`<LIB Sources="" AdditionalDependencies=""></LIB>`, []);
        validateTaskTest(`<LIB Sources="" AdditionalLibraryDirectories=""></LIB>`, []);
        validateTaskTest(`<LIB Sources="" AdditionalOptions=""></LIB>`, []);
        validateTaskTest(`<LIB Sources="" DisplayLibrary=""></LIB>`, []);
        validateTaskTest(`<LIB Sources="" ErrorReporting=""></LIB>`, []);
        validateTaskTest(`<LIB Sources="" ExportNamedFunctions=""></LIB>`, []);
        validateTaskTest(`<LIB Sources="" ForceSymbolReferences=""></LIB>`, []);
        validateTaskTest(`<LIB Sources="" IgnoreAllDefaultLibraries=""></LIB>`, []);
        validateTaskTest(`<LIB Sources="" IgnoreSpecificDefaultLibraries=""></LIB>`, []);
        validateTaskTest(`<LIB Sources="" LinkLibraryDependencies=""></LIB>`, []);
        validateTaskTest(`<LIB Sources="" LinkTimeCodeGeneration=""></LIB>`, []);
        validateTaskTest(`<LIB Sources="" MinimumRequiredVersion=""></LIB>`, []);
        validateTaskTest(`<LIB Sources="" ModuleDefinitionFile=""></LIB>`, []);
        validateTaskTest(`<LIB Sources="" Name=""></LIB>`, []);
        validateTaskTest(`<LIB Sources="" OutputFile=""></LIB>`, []);
        validateTaskTest(`<LIB Sources="" RemoveObjects=""></LIB>`, []);
        validateTaskTest(`<LIB Sources="" SubSystem=""></LIB>`, []);
        validateTaskTest(`<LIB Sources="" SuppressStartupBanner=""></LIB>`, []);
        validateTaskTest(`<LIB Sources="" TargetMachine=""></LIB>`, []);
        validateTaskTest(`<LIB Sources="" TrackerLogDirectory=""></LIB>`, []);
        validateTaskTest(`<LIB Sources="" TreatLibWarningAsErrors=""></LIB>`, []);
        validateTaskTest(`<LIB Sources="" UseUnicodeResponseFiles=""></LIB>`, []);
        validateTaskTest(`<LIB Sources="" Verbose=""></LIB>`, []);
        validateTaskTest(`<LIB Sources="" SPAM=""></LIB>`, [
            msbuild.Issues.invalidAttribute("LIB", "SPAM", new qub.Span(16, 7))
        ]);

        validateTaskTest(`<LINK></LINK>`, [
            msbuild.Issues.missingRequiredAttribute("Sources", new qub.Span(1, 4))
        ]);
        validateTaskTest(`<LINK Sources=""></LINK>`, []);
        validateTaskTest(`<LINK Sources="" AdditionalDependencies=""></LINK>`, []);
        validateTaskTest(`<LINK Sources="" AdditionalLibraryDirectories=""></LINK>`, []);
        validateTaskTest(`<LINK Sources="" AdditionalManifestDependencies=""></LINK>`, []);
        validateTaskTest(`<LINK Sources="" AdditionalOptions=""></LINK>`, []);
        validateTaskTest(`<LINK Sources="" AddModuleNamesToAssembly=""></LINK>`, []);
        validateTaskTest(`<LINK Sources="" AllowIsolation=""></LINK>`, []);
        validateTaskTest(`<LINK Sources="" AssemblyDebug=""></LINK>`, []);
        validateTaskTest(`<LINK Sources="" AssemblyLinkResource=""></LINK>`, []);
        validateTaskTest(`<LINK Sources="" AttributeFileTracking=""></LINK>`, []);
        validateTaskTest(`<LINK Sources="" BaseAddress=""></LINK>`, []);
        validateTaskTest(`<LINK Sources="" BuildingInIDE=""></LINK>`, []);
        validateTaskTest(`<LINK Sources="" CLRImageType=""></LINK>`, []);
        validateTaskTest(`<LINK Sources="" CLRSupportLastError=""></LINK>`, []);
        validateTaskTest(`<LINK Sources="" CLRThreadAttribute=""></LINK>`, []);
        validateTaskTest(`<LINK Sources="" CLRUnmanagedCodeCheck=""></LINK>`, []);
        validateTaskTest(`<LINK Sources="" CreateHotPatchableImage=""></LINK>`, []);
        validateTaskTest(`<LINK Sources="" DataExecutionPrevention=""></LINK>`, []);
        validateTaskTest(`<LINK Sources="" DelayLoadDLLs=""></LINK>`, []);
        validateTaskTest(`<LINK Sources="" DelaySign=""></LINK>`, []);
        validateTaskTest(`<LINK Sources="" Driver=""></LINK>`, []);
        validateTaskTest(`<LINK Sources="" EmbedManagedResourceFile=""></LINK>`, []);
        validateTaskTest(`<LINK Sources="" EnableCOMDATFolding=""></LINK>`, []);
        validateTaskTest(`<LINK Sources="" EnableUAC=""></LINK>`, []);
        validateTaskTest(`<LINK Sources="" EntryPointSymbol=""></LINK>`, []);
        validateTaskTest(`<LINK Sources="" FixedBaseAddress=""></LINK>`, []);
        validateTaskTest(`<LINK Sources="" ForceFileOutput=""></LINK>`, []);
        validateTaskTest(`<LINK Sources="" ForceSymbolReferences=""></LINK>`, []);
        validateTaskTest(`<LINK Sources="" FunctionOrder=""></LINK>`, []);
        validateTaskTest(`<LINK Sources="" GenerateDebugInformation=""></LINK>`, []);
        validateTaskTest(`<LINK Sources="" GenerateManifest=""></LINK>`, []);
        validateTaskTest(`<LINK Sources="" GenerateMapFile=""></LINK>`, []);
        validateTaskTest(`<LINK Sources="" HeapCommitSize=""></LINK>`, []);
        validateTaskTest(`<LINK Sources="" HeapReserveSize=""></LINK>`, []);
        validateTaskTest(`<LINK Sources="" IgnoreAllDefaultLibraries=""></LINK>`, []);
        validateTaskTest(`<LINK Sources="" IgnoreEmbeddedIDL=""></LINK>`, []);
        validateTaskTest(`<LINK Sources="" IgnoreImportLibrary=""></LINK>`, []);
        validateTaskTest(`<LINK Sources="" IgnoreSpecificDefaultLibraries=""></LINK>`, []);
        validateTaskTest(`<LINK Sources="" ImageHasSafeExceptionHandlers=""></LINK>`, []);
        validateTaskTest(`<LINK Sources="" ImportLibrary=""></LINK>`, []);
        validateTaskTest(`<LINK Sources="" KeyContainer=""></LINK>`, []);
        validateTaskTest(`<LINK Sources="" KeyFile=""></LINK>`, []);
        validateTaskTest(`<LINK Sources="" LargeAddressAware=""></LINK>`, []);
        validateTaskTest(`<LINK Sources="" LinkDLL=""></LINK>`, []);
        validateTaskTest(`<LINK Sources="" LinkErrorReporting=""></LINK>`, []);
        validateTaskTest(`<LINK Sources="" LinkIncremental=""></LINK>`, []);
        validateTaskTest(`<LINK Sources="" LinkLibraryDependencies=""></LINK>`, []);
        validateTaskTest(`<LINK Sources="" LinkStatus=""></LINK>`, []);
        validateTaskTest(`<LINK Sources="" LinkTimeCodeGeneration=""></LINK>`, []);
        validateTaskTest(`<LINK Sources="" ManifestFile=""></LINK>`, []);
        validateTaskTest(`<LINK Sources="" MapExports=""></LINK>`, []);
        validateTaskTest(`<LINK Sources="" MapFileName=""></LINK>`, []);
        validateTaskTest(`<LINK Sources="" MergedIDLBaseFileName=""></LINK>`, []);
        validateTaskTest(`<LINK Sources="" MergeSections=""></LINK>`, []);
        validateTaskTest(`<LINK Sources="" MidlCommandFile=""></LINK>`, []);
        validateTaskTest(`<LINK Sources="" MinimumRequiredVersion=""></LINK>`, []);
        validateTaskTest(`<LINK Sources="" ModuleDefinitionFile=""></LINK>`, []);
        validateTaskTest(`<LINK Sources="" MSDOSStubFileName=""></LINK>`, []);
        validateTaskTest(`<LINK Sources="" NoEntryPoint=""></LINK>`, []);
        validateTaskTest(`<LINK Sources="" ObjectFiles=""></LINK>`, []);
        validateTaskTest(`<LINK Sources="" OptimizeReferences=""></LINK>`, []);
        validateTaskTest(`<LINK Sources="" OutputFile=""></LINK>`, []);
        validateTaskTest(`<LINK Sources="" PerUserRedirection=""></LINK>`, []);
        validateTaskTest(`<LINK Sources="" PreprocessOutput=""></LINK>`, []);
        validateTaskTest(`<LINK Sources="" PreventDllBinding=""></LINK>`, []);
        validateTaskTest(`<LINK Sources="" Profile=""></LINK>`, []);
        validateTaskTest(`<LINK Sources="" ProfileGuidedDatabase=""></LINK>`, []);
        validateTaskTest(`<LINK Sources="" ProgramDatabaseFile=""></LINK>`, []);
        validateTaskTest(`<LINK Sources="" RandomizedBaseAddress=""></LINK>`, []);
        validateTaskTest(`<LINK Sources="" RegisterOutput=""></LINK>`, []);
        validateTaskTest(`<LINK Sources="" SectionAlignment=""></LINK>`, []);
        validateTaskTest(`<LINK Sources="" SetChecksum=""></LINK>`, []);
        validateTaskTest(`<LINK Sources="" ShowProgress=""></LINK>`, []);
        validateTaskTest(`<LINK Sources="" SpecifySectionAttributes=""></LINK>`, []);
        validateTaskTest(`<LINK Sources="" StackCommitSize=""></LINK>`, []);
        validateTaskTest(`<LINK Sources="" StackReserveSize=""></LINK>`, []);
        validateTaskTest(`<LINK Sources="" StripPrivateSymbols=""></LINK>`, []);
        validateTaskTest(`<LINK Sources="" SubSystem=""></LINK>`, []);
        validateTaskTest(`<LINK Sources="" SupportNobindOfDelayLoadedDLL=""></LINK>`, []);
        validateTaskTest(`<LINK Sources="" SupportUnloadOfDelayLoadedDLL=""></LINK>`, []);
        validateTaskTest(`<LINK Sources="" SuppressStartupBanner=""></LINK>`, []);
        validateTaskTest(`<LINK Sources="" SwapRunFromCD=""></LINK>`, []);
        validateTaskTest(`<LINK Sources="" SwapRunFromNET=""></LINK>`, []);
        validateTaskTest(`<LINK Sources="" TargetMachine=""></LINK>`, []);
        validateTaskTest(`<LINK Sources="" TerminalServerAware=""></LINK>`, []);
        validateTaskTest(`<LINK Sources="" TrackerLogDirectory=""></LINK>`, []);
        validateTaskTest(`<LINK Sources="" TreatLinkerWarningAsErrors=""></LINK>`, []);
        validateTaskTest(`<LINK Sources="" TurnOffAssemblyGeneration=""></LINK>`, []);
        validateTaskTest(`<LINK Sources="" TypeLibraryFile=""></LINK>`, []);
        validateTaskTest(`<LINK Sources="" TypeLibraryResourceID=""></LINK>`, []);
        validateTaskTest(`<LINK Sources="" UACExecutionLevel=""></LINK>`, []);
        validateTaskTest(`<LINK Sources="" UACUIAccess=""></LINK>`, []);
        validateTaskTest(`<LINK Sources="" UseLibraryDependencyInputs=""></LINK>`, []);
        validateTaskTest(`<LINK Sources="" Version=""></LINK>`, []);
        validateTaskTest(`<LINK Sources="" SPAM=""></LINK>`, [
            msbuild.Issues.invalidAttribute("Link", "SPAM", new qub.Span(17, 7))
        ]);

        validateTaskTest(`<MakeDir></MakeDir>`, [
            msbuild.Issues.missingRequiredAttribute("Directories", new qub.Span(1, 7))
        ]);
        validateTaskTest(`<MakeDir Directories=""></MakeDir>`, []);
        validateTaskTest(`<MakeDir Directories="test"></MakeDir>`, []);
        validateTaskTest(`<MakeDir Directories="@"></MakeDir>`, []);
        validateTaskTest(`<MakeDir Directories="@("></MakeDir>`, [
            msbuild.Issues.missingItemName(new qub.Span(23, 1)),
            msbuild.Issues.missingRightParenthesis(new qub.Span(23, 1))
        ]);
        validateTaskTest(`<MakeDir Directories="@()"></MakeDir>`, [
            msbuild.Issues.expectedItemName(new qub.Span(24, 1))
        ]);
        validateTaskTest(`<MakeDir Directories="@(test"></MakeDir>`, [
            msbuild.Issues.missingRightParenthesis(new qub.Span(23, 1))
        ]);
        validateTaskTest(`<MakeDir Directories="@(test)"></MakeDir>`, []);
        validateTaskTest(`<MakeDir Directories="@(te#st)"></MakeDir>`, [
            msbuild.Issues.invalidItemNameCharacter("#", new qub.Span(26, 1))
        ]);
        validateTaskTest(`<MakeDir Directories="" DirectoriesCreated=""></MakeDir>`, []);
        validateTaskTest(`<MakeDir Directories="" SPAM=""></MakeDir>`, [
            msbuild.Issues.invalidAttribute("MakeDir", "SPAM", new qub.Span(24, 7))
        ]);

        validateTaskTest(`<Message></Message>`, []);
        validateTaskTest(`<Message Importance=""></Message>`, []);
        validateTaskTest(`<Message Text=""></Message>`, []);
        validateTaskTest(`<Message SPAM=""></Message>`, [
            msbuild.Issues.invalidAttribute("Message", "SPAM", new qub.Span(9, 7))
        ]);

        validateTaskTest(`<MIDL></MIDL>`, [
            msbuild.Issues.missingRequiredAttribute("Source", new qub.Span(1, 4))
        ]);
        validateTaskTest(`<MIDL Source=""></MIDL>`, []);
        validateTaskTest(`<MIDL Source="" AdditionalIncludeDirectories=""></MIDL>`, []);
        validateTaskTest(`<MIDL Source="" AdditionalOptions=""></MIDL>`, []);
        validateTaskTest(`<MIDL Source="" ApplicationConfigurationMode=""></MIDL>`, []);
        validateTaskTest(`<MIDL Source="" ClientStubFile=""></MIDL>`, []);
        validateTaskTest(`<MIDL Source="" CPreprocessOptions=""></MIDL>`, []);
        validateTaskTest(`<MIDL Source="" DefaultCharType=""></MIDL>`, []);
        validateTaskTest(`<MIDL Source="" DllDataFileName=""></MIDL>`, []);
        validateTaskTest(`<MIDL Source="" EnableErrorChecks=""></MIDL>`, []);
        validateTaskTest(`<MIDL Source="" ErrorCheckAllocations=""></MIDL>`, []);
        validateTaskTest(`<MIDL Source="" ErrorCheckBounds=""></MIDL>`, []);
        validateTaskTest(`<MIDL Source="" ErrorCheckEnumRange=""></MIDL>`, []);
        validateTaskTest(`<MIDL Source="" ErrorCheckRefPointers=""></MIDL>`, []);
        validateTaskTest(`<MIDL Source="" ErrorCheckStubData=""></MIDL>`, []);
        validateTaskTest(`<MIDL Source="" GenerateClientFiles=""></MIDL>`, []);
        validateTaskTest(`<MIDL Source="" GenerateServerFiles=""></MIDL>`, []);
        validateTaskTest(`<MIDL Source="" GenerateStublessProxies=""></MIDL>`, []);
        validateTaskTest(`<MIDL Source="" GenerateTypeLibrary=""></MIDL>`, []);
        validateTaskTest(`<MIDL Source="" HeaderFileName=""></MIDL>`, []);
        validateTaskTest(`<MIDL Source="" IgnoreStandardIncludePath=""></MIDL>`, []);
        validateTaskTest(`<MIDL Source="" InterfaceIdentifierFileName=""></MIDL>`, []);
        validateTaskTest(`<MIDL Source="" LocaleID=""></MIDL>`, []);
        validateTaskTest(`<MIDL Source="" MkTypLibCompatible=""></MIDL>`, []);
        validateTaskTest(`<MIDL Source="" OutputDirectory=""></MIDL>`, []);
        validateTaskTest(`<MIDL Source="" PreprocessorDefinitions=""></MIDL>`, []);
        validateTaskTest(`<MIDL Source="" ProxyFileName=""></MIDL>`, []);
        validateTaskTest(`<MIDL Source="" RedirectOutputAndErrors=""></MIDL>`, []);
        validateTaskTest(`<MIDL Source="" ServerStubFile=""></MIDL>`, []);
        validateTaskTest(`<MIDL Source="" StructMemberAlignment=""></MIDL>`, []);
        validateTaskTest(`<MIDL Source="" SuppressCompilerWarnings=""></MIDL>`, []);
        validateTaskTest(`<MIDL Source="" SuppressStartupBanner=""></MIDL>`, []);
        validateTaskTest(`<MIDL Source="" TargetEnvironment=""></MIDL>`, []);
        validateTaskTest(`<MIDL Source="" TrackerLogDirectory=""></MIDL>`, []);
        validateTaskTest(`<MIDL Source="" TypeLibFormat=""></MIDL>`, []);
        validateTaskTest(`<MIDL Source="" TypeLibraryName=""></MIDL>`, []);
        validateTaskTest(`<MIDL Source="" UndefinePreprocessorDefinitions=""></MIDL>`, []);
        validateTaskTest(`<MIDL Source="" ValidateAllParameters=""></MIDL>`, []);
        validateTaskTest(`<MIDL Source="" WarnAsError=""></MIDL>`, []);
        validateTaskTest(`<MIDL Source="" WarningLevel=""></MIDL>`, []);
        validateTaskTest(`<MIDL Source="" SPAM=""></MIDL>`, [
            msbuild.Issues.invalidAttribute("MIDL", "SPAM", new qub.Span(16, 7))
        ]);

        validateTaskTest(`<Move></Move>`, [
            msbuild.Issues.missingRequiredAttribute("DestinationFiles", new qub.Span(1, 4)),
            msbuild.Issues.missingRequiredAttribute("DestinationFolder", new qub.Span(1, 4)),
            msbuild.Issues.missingRequiredAttribute("SourceFiles", new qub.Span(1, 4))
        ]);
        validateTaskTest(`<Move SourceFiles=""></Move>`, [
            msbuild.Issues.missingRequiredAttribute("DestinationFiles", new qub.Span(1, 4)),
            msbuild.Issues.missingRequiredAttribute("DestinationFolder", new qub.Span(1, 4))
        ]);
        validateTaskTest(`<Move SourceFiles="" DestinationFiles=""></Move>`, []);
        validateTaskTest(`<Move SourceFiles="" DestinationFolder=""></Move>`, []);
        validateTaskTest(`<Move SourceFiles="" DestinationFiles="" DestinationFolder=""></Move>`, [
            msbuild.Issues.attributeCantBeDefinedWith("DestinationFiles", "DestinationFolder", new qub.Span(21, 16)),
            msbuild.Issues.attributeCantBeDefinedWith("DestinationFolder", "DestinationFiles", new qub.Span(41, 17))
        ]);
        validateTaskTest(`<Move SourceFiles="" DestinationFolder="" MovedFiles=""></Move>`, []);
        validateTaskTest(`<Move SourceFiles="" DestinationFolder="" OverwriteReadOnlyFiles=""></Move>`, []);
        validateTaskTest(`<Move SourceFiles="" DestinationFolder="" SPAM=""></Move>`, [
            msbuild.Issues.invalidAttribute("Move", "SPAM", new qub.Span(42, 7))
        ]);

        validateTaskTest(`<MSBuild></MSBuild>`, [
            msbuild.Issues.missingRequiredAttribute("Projects", new qub.Span(1, 7))
        ]);
        validateTaskTest(`<MSBuild Projects=""></MSBuild>`, []);
        validateTaskTest(`<MSBuild Projects="" BuildInParallel=""></MSBuild>`, []);
        validateTaskTest(`<MSBuild Projects="" Properties=""></MSBuild>`, []);
        validateTaskTest(`<MSBuild Projects="" RebaseOutputs=""></MSBuild>`, []);
        validateTaskTest(`<MSBuild Projects="" RemoveProperties=""></MSBuild>`, []);
        validateTaskTest(`<MSBuild Projects="" RunEachTargetSeparately=""></MSBuild>`, []);
        validateTaskTest(`<MSBuild Projects="" SkipNonexistentProjects=""></MSBuild>`, []);
        validateTaskTest(`<MSBuild Projects="" StopOnFirstFailure=""></MSBuild>`, []);
        validateTaskTest(`<MSBuild Projects="" TargetAndPropertyListSeparators=""></MSBuild>`, []);
        validateTaskTest(`<MSBuild Projects="" TargetOutputs=""></MSBuild>`, []);
        validateTaskTest(`<MSBuild Projects="" Targets=""></MSBuild>`, []);
        validateTaskTest(`<MSBuild Projects="" ToolsVersion=""></MSBuild>`, []);
        validateTaskTest(`<MSBuild Projects="" UnloadProjectsOnCompletion=""></MSBuild>`, []);
        validateTaskTest(`<MSBuild Projects="" UseResultsCache=""></MSBuild>`, []);
        validateTaskTest(`<MSBuild Projects="" SPAM=""></MSBuild>`, [
            msbuild.Issues.invalidAttribute("MSBuild", "SPAM", new qub.Span(21, 7))
        ]);

        validateTaskTest(`<MT></MT>`, []);
        validateTaskTest(`<MT AdditionalManifestFiles=""></MT>`, []);
        validateTaskTest(`<MT AdditionalOptions=""></MT>`, []);
        validateTaskTest(`<MT AssemblyIdentity=""></MT>`, []);
        validateTaskTest(`<MT ComponentFileName=""></MT>`, []);
        validateTaskTest(`<MT DependencyInformationFile=""></MT>`, []);
        validateTaskTest(`<MT EmbedManifest=""></MT>`, []);
        validateTaskTest(`<MT EnableDPIAwareness=""></MT>`, []);
        validateTaskTest(`<MT GenerateCatalogFiles=""></MT>`, []);
        validateTaskTest(`<MT GenerateCategoryTags=""></MT>`, []);
        validateTaskTest(`<MT InputResourceManifests=""></MT>`, []);
        validateTaskTest(`<MT ManifestFromManagedAssembly=""></MT>`, []);
        validateTaskTest(`<MT ManifestToIgnore=""></MT>`, []);
        validateTaskTest(`<MT OutputManifestFile=""></MT>`, []);
        validateTaskTest(`<MT OutputResourceManifests=""></MT>`, []);
        validateTaskTest(`<MT RegistrarScriptFile=""></MT>`, []);
        validateTaskTest(`<MT ReplacementsFile=""></MT>`, []);
        validateTaskTest(`<MT ResourceOutputFileName=""></MT>`, []);
        validateTaskTest(`<MT Sources=""></MT>`, []);
        validateTaskTest(`<MT SuppressDependencyElement=""></MT>`, []);
        validateTaskTest(`<MT SuppressStartupBanner=""></MT>`, []);
        validateTaskTest(`<MT TrackerLogDirectory=""></MT>`, []);
        validateTaskTest(`<MT TypeLibraryFile=""></MT>`, []);
        validateTaskTest(`<MT UpdateFileHashes=""></MT>`, []);
        validateTaskTest(`<MT UpdateFileHashesSearchPath=""></MT>`, []);
        validateTaskTest(`<MT VerboseOutput=""></MT>`, []);
        validateTaskTest(`<MT SPAM=""></MT>`, [
            msbuild.Issues.invalidAttribute("MT", "SPAM", new qub.Span(4, 7))
        ]);

        validateTaskTest(`<RC></RC>`, [
            msbuild.Issues.missingRequiredAttribute("Source", new qub.Span(1, 2))
        ]);
        validateTaskTest(`<RC Source=""></RC>`, []);
        validateTaskTest(`<RC Source="" AdditionalIncludeDirectories=""></RC>`, []);
        validateTaskTest(`<RC Source="" AdditionalOptions=""></RC>`, []);
        validateTaskTest(`<RC Source="" Culture=""></RC>`, []);
        validateTaskTest(`<RC Source="" IgnoreStandardIncludePath=""></RC>`, []);
        validateTaskTest(`<RC Source="" NullTerminateStrings=""></RC>`, []);
        validateTaskTest(`<RC Source="" PreprocessorDefinitions=""></RC>`, []);
        validateTaskTest(`<RC Source="" ResourceOutputFileName=""></RC>`, []);
        validateTaskTest(`<RC Source="" ShowProgress=""></RC>`, []);
        validateTaskTest(`<RC Source="" SuppressStartupBanner=""></RC>`, []);
        validateTaskTest(`<RC Source="" TrackerLogDirectory=""></RC>`, []);
        validateTaskTest(`<RC Source="" UndefinePreprocessorDefinitions=""></RC>`, []);
        validateTaskTest(`<RC Source="" SPAM=""></RC>`, [
            msbuild.Issues.invalidAttribute("RC", "SPAM", new qub.Span(14, 7))
        ]);

        validateTaskTest(`<ReadLinesFromFile></ReadLinesFromFile>`, [
            msbuild.Issues.missingRequiredAttribute("File", new qub.Span(1, 17))
        ]);
        validateTaskTest(`<ReadLinesFromFile File=""></ReadLinesFromFile>`, []);
        validateTaskTest(`<ReadLinesFromFile File="" Lines=""></ReadLinesFromFile>`, []);
        validateTaskTest(`<ReadLinesFromFile File="" SPAM=""></ReadLinesFromFile>`, [
            msbuild.Issues.invalidAttribute("ReadLinesFromFile", "SPAM", new qub.Span(27, 7))
        ]);

        validateTaskTest(`<RegisterAssembly></RegisterAssembly>`, [
            msbuild.Issues.missingRequiredAttribute("Assemblies", new qub.Span(1, 16))
        ]);
        validateTaskTest(`<RegisterAssembly Assemblies=""></RegisterAssembly>`, []);
        validateTaskTest(`<RegisterAssembly Assemblies="" AssemblyListFile=""></RegisterAssembly>`, []);
        validateTaskTest(`<RegisterAssembly Assemblies="" CreateCodeBase=""></RegisterAssembly>`, []);
        validateTaskTest(`<RegisterAssembly Assemblies="" TypeLibFiles=""></RegisterAssembly>`, []);
        validateTaskTest(`<RegisterAssembly Assemblies="" SPAM=""></RegisterAssembly>`, [
            msbuild.Issues.invalidAttribute("RegisterAssembly", "SPAM", new qub.Span(32, 7))
        ]);

        validateTaskTest(`<RemoveDir></RemoveDir>`, [
            msbuild.Issues.missingRequiredAttribute("Directories", new qub.Span(1, 9))
        ]);
        validateTaskTest(`<RemoveDir Directories=""></RemoveDir>`, []);
        validateTaskTest(`<RemoveDir Directories="" RemovedDirectories=""></RemoveDir>`, []);
        validateTaskTest(`<RemoveDir Directories="" SPAM=""></RemoveDir>`, [
            msbuild.Issues.invalidAttribute("RemoveDir", "SPAM", new qub.Span(26, 7))
        ]);

        validateTaskTest(`<RemoveDuplicates></RemoveDuplicates>`, []);
        validateTaskTest(`<RemoveDuplicates Filtered=""></RemoveDuplicates>`, []);
        validateTaskTest(`<RemoveDuplicates Inputs=""></RemoveDuplicates>`, []);
        validateTaskTest(`<RemoveDuplicates SPAM=""></RemoveDuplicates>`, [
            msbuild.Issues.invalidAttribute("RemoveDuplicates", "SPAM", new qub.Span(18, 7))
        ]);

        validateTaskTest(`<RequiresFramework35SP1Assembly></RequiresFramework35SP1Assembly>`, []);
        validateTaskTest(`<RequiresFramework35SP1Assembly Assemblies=""></RequiresFramework35SP1Assembly>`, []);
        validateTaskTest(`<RequiresFramework35SP1Assembly CreateDesktopShortcut=""></RequiresFramework35SP1Assembly>`, []);
        validateTaskTest(`<RequiresFramework35SP1Assembly DeploymentManifestEntryPoint=""></RequiresFramework35SP1Assembly>`, []);
        validateTaskTest(`<RequiresFramework35SP1Assembly EntryPoint=""></RequiresFramework35SP1Assembly>`, []);
        validateTaskTest(`<RequiresFramework35SP1Assembly ErrorReportUrl=""></RequiresFramework35SP1Assembly>`, []);
        validateTaskTest(`<RequiresFramework35SP1Assembly Files=""></RequiresFramework35SP1Assembly>`, []);
        validateTaskTest(`<RequiresFramework35SP1Assembly ReferencedAssemblies=""></RequiresFramework35SP1Assembly>`, []);
        validateTaskTest(`<RequiresFramework35SP1Assembly RequiresMinimumFramework35SP1=""></RequiresFramework35SP1Assembly>`, []);
        validateTaskTest(`<RequiresFramework35SP1Assembly SigningManifests=""></RequiresFramework35SP1Assembly>`, []);
        validateTaskTest(`<RequiresFramework35SP1Assembly SuiteName=""></RequiresFramework35SP1Assembly>`, []);
        validateTaskTest(`<RequiresFramework35SP1Assembly TargetFrameworkVersion=""></RequiresFramework35SP1Assembly>`, []);
        validateTaskTest(`<RequiresFramework35SP1Assembly SPAM=""></RequiresFramework35SP1Assembly>`, [
            msbuild.Issues.invalidAttribute("RequiresFramework35SP1Assembly", "SPAM", new qub.Span(32, 7))
        ]);

        validateTaskTest(`<ResolveAssemblyReference></ResolveAssemblyReference>`, [
            msbuild.Issues.missingRequiredAttribute("SearchPaths", new qub.Span(1, 24))
        ]);
        validateTaskTest(`<ResolveAssemblyReference SearchPaths=""></ResolveAssemblyReference>`, []);
        validateTaskTest(`<ResolveAssemblyReference SearchPaths="" AllowedAssemblyExtensions=""></ResolveAssemblyReference>`, []);
        validateTaskTest(`<ResolveAssemblyReference SearchPaths="" AllowedRelatedFileExtensions=""></ResolveAssemblyReference>`, []);
        validateTaskTest(`<ResolveAssemblyReference SearchPaths="" AppConfigFile=""></ResolveAssemblyReference>`, []);
        validateTaskTest(`<ResolveAssemblyReference SearchPaths="" AutoUnify=""></ResolveAssemblyReference>`, []);
        validateTaskTest(`<ResolveAssemblyReference SearchPaths="" Assemblies=""></ResolveAssemblyReference>`, []);
        validateTaskTest(`<ResolveAssemblyReference SearchPaths="" AssemblyFiles=""></ResolveAssemblyReference>`, []);
        validateTaskTest(`<ResolveAssemblyReference SearchPaths="" AutoUnify=""></ResolveAssemblyReference>`, []);
        validateTaskTest(`<ResolveAssemblyReference SearchPaths="" CandidateAssemblyFiles=""></ResolveAssemblyReference>`, []);
        validateTaskTest(`<ResolveAssemblyReference SearchPaths="" CopyLocalDependenciesWhenParentReferenceInGac=""></ResolveAssemblyReference>`, []);
        validateTaskTest(`<ResolveAssemblyReference SearchPaths="" CopyLocalFiles=""></ResolveAssemblyReference>`, []);
        validateTaskTest(`<ResolveAssemblyReference SearchPaths="" FilesWritten=""></ResolveAssemblyReference>`, []);
        validateTaskTest(`<ResolveAssemblyReference SearchPaths="" FindDependencies=""></ResolveAssemblyReference>`, []);
        validateTaskTest(`<ResolveAssemblyReference SearchPaths="" FindRelatedFiles=""></ResolveAssemblyReference>`, []);
        validateTaskTest(`<ResolveAssemblyReference SearchPaths="" FindSatellites=""></ResolveAssemblyReference>`, []);
        validateTaskTest(`<ResolveAssemblyReference SearchPaths="" FindSerializationAssemblies=""></ResolveAssemblyReference>`, []);
        validateTaskTest(`<ResolveAssemblyReference SearchPaths="" FullFrameworkAssemblyTables=""></ResolveAssemblyReference>`, []);
        validateTaskTest(`<ResolveAssemblyReference SearchPaths="" FullFrameworkFolders=""></ResolveAssemblyReference>`, []);
        validateTaskTest(`<ResolveAssemblyReference SearchPaths="" FullTargetFrameworkSubsetNames=""></ResolveAssemblyReference>`, []);
        validateTaskTest(`<ResolveAssemblyReference SearchPaths="" IgnoreDefaultInstalledAssemblyTables=""></ResolveAssemblyReference>`, []);
        validateTaskTest(`<ResolveAssemblyReference SearchPaths="" IgnoreDefaultInstalledAssemblySubsetTables=""></ResolveAssemblyReference>`, []);
        validateTaskTest(`<ResolveAssemblyReference SearchPaths="" InstalledAssemblySubsetTables=""></ResolveAssemblyReference>`, []);
        validateTaskTest(`<ResolveAssemblyReference SearchPaths="" InstalledAssemblyTables=""></ResolveAssemblyReference>`, []);
        validateTaskTest(`<ResolveAssemblyReference SearchPaths="" LatestTargetFrameworkDirectories=""></ResolveAssemblyReference>`, []);
        validateTaskTest(`<ResolveAssemblyReference SearchPaths="" ProfileName=""></ResolveAssemblyReference>`, []);
        validateTaskTest(`<ResolveAssemblyReference SearchPaths="" RelatedFiles=""></ResolveAssemblyReference>`, []);
        validateTaskTest(`<ResolveAssemblyReference SearchPaths="" ResolvedDependencyFiles=""></ResolveAssemblyReference>`, []);
        validateTaskTest(`<ResolveAssemblyReference SearchPaths="" ResolvedFiles=""></ResolveAssemblyReference>`, []);
        validateTaskTest(`<ResolveAssemblyReference SearchPaths="" SatelliteFiles=""></ResolveAssemblyReference>`, []);
        validateTaskTest(`<ResolveAssemblyReference SearchPaths="" ScatterFiles=""></ResolveAssemblyReference>`, []);
        validateTaskTest(`<ResolveAssemblyReference SearchPaths="" SerializationAssemblyFiles=""></ResolveAssemblyReference>`, []);
        validateTaskTest(`<ResolveAssemblyReference SearchPaths="" Silent=""></ResolveAssemblyReference>`, []);
        validateTaskTest(`<ResolveAssemblyReference SearchPaths="" StateFile=""></ResolveAssemblyReference>`, []);
        validateTaskTest(`<ResolveAssemblyReference SearchPaths="" SuggestedRedirects=""></ResolveAssemblyReference>`, []);
        validateTaskTest(`<ResolveAssemblyReference SearchPaths="" TargetedRuntimeVersion=""></ResolveAssemblyReference>`, []);
        validateTaskTest(`<ResolveAssemblyReference SearchPaths="" TargetFrameworkDirectories=""></ResolveAssemblyReference>`, []);
        validateTaskTest(`<ResolveAssemblyReference SearchPaths="" TargetFrameworkMoniker=""></ResolveAssemblyReference>`, []);
        validateTaskTest(`<ResolveAssemblyReference SearchPaths="" TargetFrameworkMonikerDisplayName=""></ResolveAssemblyReference>`, []);
        validateTaskTest(`<ResolveAssemblyReference SearchPaths="" TargetFrameworkSubsets=""></ResolveAssemblyReference>`, []);
        validateTaskTest(`<ResolveAssemblyReference SearchPaths="" TargetFrameworkVersion=""></ResolveAssemblyReference>`, []);
        validateTaskTest(`<ResolveAssemblyReference SearchPaths="" TargetProcessorArchitecture=""></ResolveAssemblyReference>`, []);
        validateTaskTest(`<ResolveAssemblyReference SearchPaths="" SPAM=""></ResolveAssemblyReference>`, [
            msbuild.Issues.invalidAttribute("ResolveAssemblyReference", "SPAM", new qub.Span(41, 7))
        ]);

        validateTaskTest(`<ResolveComReference></ResolveComReference>`, []);
        validateTaskTest(`<ResolveComReference DelaySign=""></ResolveComReference>`, []);
        validateTaskTest(`<ResolveComReference EnvironmentVariables=""></ResolveComReference>`, []);
        validateTaskTest(`<ResolveComReference ExecuteAsTool=""></ResolveComReference>`, []);
        validateTaskTest(`<ResolveComReference IncludeVersionInInteropName=""></ResolveComReference>`, []);
        validateTaskTest(`<ResolveComReference KeyContainer=""></ResolveComReference>`, []);
        validateTaskTest(`<ResolveComReference KeyFile=""></ResolveComReference>`, []);
        validateTaskTest(`<ResolveComReference NoClassMembers=""></ResolveComReference>`, []);
        validateTaskTest(`<ResolveComReference ResolvedAssemblyReferences=""></ResolveComReference>`, []);
        validateTaskTest(`<ResolveComReference ResolvedFiles=""></ResolveComReference>`, []);
        validateTaskTest(`<ResolveComReference ResolvedModules=""></ResolveComReference>`, []);
        validateTaskTest(`<ResolveComReference SdkToolsPath=""></ResolveComReference>`, []);
        validateTaskTest(`<ResolveComReference StateFile=""></ResolveComReference>`, []);
        validateTaskTest(`<ResolveComReference TargetFrameworkVersion=""></ResolveComReference>`, []);
        validateTaskTest(`<ResolveComReference TargetProcessorArchitecture=""></ResolveComReference>`, []);
        validateTaskTest(`<ResolveComReference TypeLibFiles=""></ResolveComReference>`, []);
        validateTaskTest(`<ResolveComReference TypeLibNames=""></ResolveComReference>`, []);
        validateTaskTest(`<ResolveComReference WrapperOutputDirectory=""></ResolveComReference>`, []);
        validateTaskTest(`<ResolveComReference SPAM=""></ResolveComReference>`, [
            msbuild.Issues.invalidAttribute("ResolveComReference", "SPAM", new qub.Span(21, 7))
        ]);

        validateTaskTest(`<ResolveKeySource></ResolveKeySource>`, []);
        validateTaskTest(`<ResolveKeySource AutoClosePasswordPromptShow=""></ResolveKeySource>`, []);
        validateTaskTest(`<ResolveKeySource AutoClosePasswordPromptTimeout=""></ResolveKeySource>`, []);
        validateTaskTest(`<ResolveKeySource CertificateFile=""></ResolveKeySource>`, []);
        validateTaskTest(`<ResolveKeySource CertificateThumbprint=""></ResolveKeySource>`, []);
        validateTaskTest(`<ResolveKeySource CertificateThumbprint=""></ResolveKeySource>`, []);
        validateTaskTest(`<ResolveKeySource ResolvedKeyContainer=""></ResolveKeySource>`, []);
        validateTaskTest(`<ResolveKeySource ResolvedKeyFile=""></ResolveKeySource>`, []);
        validateTaskTest(`<ResolveKeySource ResolvedThumbprint=""></ResolveKeySource>`, []);
        validateTaskTest(`<ResolveKeySource ShowImportDialogDespitePreviousFailures=""></ResolveKeySource>`, []);
        validateTaskTest(`<ResolveKeySource SuppressAutoClosePasswordPrompt=""></ResolveKeySource>`, []);
        validateTaskTest(`<ResolveKeySource SPAM=""></ResolveKeySource>`, [
            msbuild.Issues.invalidAttribute("ResolveKeySource", "SPAM", new qub.Span(18, 7))
        ]);

        validateTaskTest(`<ResolveManifestFiles></ResolveManifestFiles>`, []);
        validateTaskTest(`<ResolveManifestFiles DeploymentManifestEntryPoint=""></ResolveManifestFiles>`, []);
        validateTaskTest(`<ResolveManifestFiles EntryPoint=""></ResolveManifestFiles>`, []);
        validateTaskTest(`<ResolveManifestFiles ExtraFiles=""></ResolveManifestFiles>`, []);
        validateTaskTest(`<ResolveManifestFiles ManagedAssemblies=""></ResolveManifestFiles>`, []);
        validateTaskTest(`<ResolveManifestFiles NativeAssemblies=""></ResolveManifestFiles>`, []);
        validateTaskTest(`<ResolveManifestFiles OutputAssemblies=""></ResolveManifestFiles>`, []);
        validateTaskTest(`<ResolveManifestFiles OutputDeploymentManifestEntryPoint=""></ResolveManifestFiles>`, []);
        validateTaskTest(`<ResolveManifestFiles OutputEntryPoint=""></ResolveManifestFiles>`, []);
        validateTaskTest(`<ResolveManifestFiles OutputFiles=""></ResolveManifestFiles>`, []);
        validateTaskTest(`<ResolveManifestFiles PublishFiles=""></ResolveManifestFiles>`, []);
        validateTaskTest(`<ResolveManifestFiles SatelliteAssemblies=""></ResolveManifestFiles>`, []);
        validateTaskTest(`<ResolveManifestFiles SigningManifests=""></ResolveManifestFiles>`, []);
        validateTaskTest(`<ResolveManifestFiles TargetCulture=""></ResolveManifestFiles>`, []);
        validateTaskTest(`<ResolveManifestFiles TargetFrameworkVersion=""></ResolveManifestFiles>`, []);
        validateTaskTest(`<ResolveManifestFiles SPAM=""></ResolveManifestFiles>`, [
            msbuild.Issues.invalidAttribute("ResolveManifestFiles", "SPAM", new qub.Span(22, 7))
        ]);

        validateTaskTest(`<ResolveNativeReference></ResolveNativeReference>`, [
            msbuild.Issues.missingRequiredAttribute("AdditionalSearchPaths", new qub.Span(1, 22)),
            msbuild.Issues.missingRequiredAttribute("NativeReferences", new qub.Span(1, 22))
        ]);
        validateTaskTest(`<ResolveNativeReference AdditionalSearchPaths="" NativeReferences=""></ResolveNativeReference>`, []);
        validateTaskTest(`<ResolveNativeReference AdditionalSearchPaths="" NativeReferences="" ContainedComComponents=""></ResolveNativeReference>`, []);
        validateTaskTest(`<ResolveNativeReference AdditionalSearchPaths="" NativeReferences="" ContainedLooseEtcFiles=""></ResolveNativeReference>`, []);
        validateTaskTest(`<ResolveNativeReference AdditionalSearchPaths="" NativeReferences="" ContainedLooseTlbFiles=""></ResolveNativeReference>`, []);
        validateTaskTest(`<ResolveNativeReference AdditionalSearchPaths="" NativeReferences="" ContainedPrerequisiteAssemblies=""></ResolveNativeReference>`, []);
        validateTaskTest(`<ResolveNativeReference AdditionalSearchPaths="" NativeReferences="" ContainedTypeLibraries=""></ResolveNativeReference>`, []);
        validateTaskTest(`<ResolveNativeReference AdditionalSearchPaths="" NativeReferences="" ContainingReferenceFiles=""></ResolveNativeReference>`, []);
        validateTaskTest(`<ResolveNativeReference AdditionalSearchPaths="" NativeReferences="" SPAM=""></ResolveNativeReference>`, [
            msbuild.Issues.invalidAttribute("ResolveNativeReference", "SPAM", new qub.Span(69, 7))
        ]);

        validateTaskTest(`<ResolveNonMSBuildProjectOutput></ResolveNonMSBuildProjectOutput>`, [
            msbuild.Issues.missingRequiredAttribute("ProjectReferences", new qub.Span(1, 30))
        ]);
        validateTaskTest(`<ResolveNonMSBuildProjectOutput ProjectReferences=""></ResolveNonMSBuildProjectOutput>`, []);
        validateTaskTest(`<ResolveNonMSBuildProjectOutput ProjectReferences="" PreresolvedProjectOutputs=""></ResolveNonMSBuildProjectOutput>`, []);
        validateTaskTest(`<ResolveNonMSBuildProjectOutput ProjectReferences="" ResolvedOutputPaths=""></ResolveNonMSBuildProjectOutput>`, []);
        validateTaskTest(`<ResolveNonMSBuildProjectOutput ProjectReferences="" UnresolvedProjectReferences=""></ResolveNonMSBuildProjectOutput>`, []);
        validateTaskTest(`<ResolveNonMSBuildProjectOutput ProjectReferences="" SPAM=""></ResolveNonMSBuildProjectOutput>`, [
            msbuild.Issues.invalidAttribute("ResolveNonMSBuildProjectOutput", "SPAM", new qub.Span(53, 7))
        ]);

        validateTaskTest(`<SetEnv></SetEnv>`, [
            msbuild.Issues.missingRequiredAttribute("Name", new qub.Span(1, 6))
        ]);
        validateTaskTest(`<SetEnv Name=""></SetEnv>`, []);
        validateTaskTest(`<SetEnv Name="" OutputEnvironmentVariable=""></SetEnv>`, []);
        validateTaskTest(`<SetEnv Name="" Prefix=""></SetEnv>`, []);
        validateTaskTest(`<SetEnv Name="" Target=""></SetEnv>`, []);
        validateTaskTest(`<SetEnv Name="" Value=""></SetEnv>`, []);
        validateTaskTest(`<SetEnv Name="" SPAM=""></SetEnv>`, [
            msbuild.Issues.invalidAttribute("SetEnv", "SPAM", new qub.Span(16, 7))
        ]);

        validateTaskTest(`<SGen></SGen>`, [
            msbuild.Issues.missingRequiredAttribute("BuildAssemblyName", new qub.Span(1, 4)),
            msbuild.Issues.missingRequiredAttribute("BuildAssemblyPath", new qub.Span(1, 4)),
            msbuild.Issues.missingRequiredAttribute("ShouldGenerateSerializer", new qub.Span(1, 4)),
            msbuild.Issues.missingRequiredAttribute("UseProxyTypes", new qub.Span(1, 4))
        ]);
        validateTaskTest(`<SGen BuildAssemblyName="" BuildAssemblyPath="" ShouldGenerateSerializer="" UseProxyTypes=""></SGen>`, []);
        validateTaskTest(`<SGen BuildAssemblyName="" BuildAssemblyPath="" ShouldGenerateSerializer="" UseProxyTypes="" DelaySign=""></SGen>`, []);
        validateTaskTest(`<SGen BuildAssemblyName="" BuildAssemblyPath="" ShouldGenerateSerializer="" UseProxyTypes="" KeyContainer=""></SGen>`, []);
        validateTaskTest(`<SGen BuildAssemblyName="" BuildAssemblyPath="" ShouldGenerateSerializer="" UseProxyTypes="" KeyFile=""></SGen>`, []);
        validateTaskTest(`<SGen BuildAssemblyName="" BuildAssemblyPath="" ShouldGenerateSerializer="" UseProxyTypes="" Platform=""></SGen>`, []);
        validateTaskTest(`<SGen BuildAssemblyName="" BuildAssemblyPath="" ShouldGenerateSerializer="" UseProxyTypes="" References=""></SGen>`, []);
        validateTaskTest(`<SGen BuildAssemblyName="" BuildAssemblyPath="" ShouldGenerateSerializer="" UseProxyTypes="" SdkToolsPath=""></SGen>`, []);
        validateTaskTest(`<SGen BuildAssemblyName="" BuildAssemblyPath="" ShouldGenerateSerializer="" UseProxyTypes="" SerializationAssembly=""></SGen>`, []);
        validateTaskTest(`<SGen BuildAssemblyName="" BuildAssemblyPath="" ShouldGenerateSerializer="" UseProxyTypes="" SerializationAssemblyName=""></SGen>`, []);
        validateTaskTest(`<SGen BuildAssemblyName="" BuildAssemblyPath="" ShouldGenerateSerializer="" UseProxyTypes="" Timeout=""></SGen>`, []);
        validateTaskTest(`<SGen BuildAssemblyName="" BuildAssemblyPath="" ShouldGenerateSerializer="" UseProxyTypes="" ToolPath=""></SGen>`, []);
        validateTaskTest(`<SGen BuildAssemblyName="" BuildAssemblyPath="" ShouldGenerateSerializer="" UseProxyTypes="" Types=""></SGen>`, []);
        validateTaskTest(`<SGen BuildAssemblyName="" BuildAssemblyPath="" ShouldGenerateSerializer="" UseProxyTypes="" SPAM=""></SGen>`, [
            msbuild.Issues.invalidAttribute("SGen", "SPAM", new qub.Span(93, 7))
        ]);

        validateTaskTest(`<SignFile></SignFile>`, [
            msbuild.Issues.missingRequiredAttribute("CertificateThumbprint", new qub.Span(1, 8)),
            msbuild.Issues.missingRequiredAttribute("SigningTarget", new qub.Span(1, 8))
        ]);
        validateTaskTest(`<SignFile CertificateThumbprint="" SigningTarget=""></SignFile>`, []);
        validateTaskTest(`<SignFile CertificateThumbprint="" SigningTarget="" TimestampUrl=""></SignFile>`, []);
        validateTaskTest(`<SignFile CertificateThumbprint="" SigningTarget="" TargetFrameworkVersion=""></SignFile>`, []);
        validateTaskTest(`<SignFile CertificateThumbprint="" SigningTarget="" SPAM=""></SignFile>`, [
            msbuild.Issues.invalidAttribute("SignFile", "SPAM", new qub.Span(52, 7))
        ]);

        validateTaskTest(`<Touch></Touch>`, [
            msbuild.Issues.missingRequiredAttribute("Files", new qub.Span(1, 5))
        ]);
        validateTaskTest(`<Touch Files=""></Touch>`, []);
        validateTaskTest(`<Touch Files="" AlwaysCreate=""></Touch>`, []);
        validateTaskTest(`<Touch Files="" ForceTouch=""></Touch>`, []);
        validateTaskTest(`<Touch Files="" Time=""></Touch>`, []);
        validateTaskTest(`<Touch Files="" TouchedFiles=""></Touch>`, []);
        validateTaskTest(`<Touch Files="" SPAM=""></Touch>`, [
            msbuild.Issues.invalidAttribute("Touch", "SPAM", new qub.Span(16, 7))
        ]);

        validateTaskTest(`<UnregisterAssembly></UnregisterAssembly>`, []);
        validateTaskTest(`<UnregisterAssembly Assemblies=""></UnregisterAssembly>`, []);
        validateTaskTest(`<UnregisterAssembly AssemblyListFile=""></UnregisterAssembly>`, []);
        validateTaskTest(`<UnregisterAssembly TypeLibFiles=""></UnregisterAssembly>`, []);
        validateTaskTest(`<UnregisterAssembly SPAM=""></UnregisterAssembly>`, [
            msbuild.Issues.invalidAttribute("UnregisterAssembly", "SPAM", new qub.Span(20, 7))
        ]);

        validateTaskTest(`<UpdateManifest></UpdateManifest>`, [
            msbuild.Issues.missingRequiredAttribute("ApplicationManifest", new qub.Span(1, 14)),
            msbuild.Issues.missingRequiredAttribute("ApplicationPath", new qub.Span(1, 14)),
            msbuild.Issues.missingRequiredAttribute("InputManifest", new qub.Span(1, 14))
        ]);
        validateTaskTest(`<UpdateManifest ApplicationManifest="" ApplicationPath="" InputManifest=""></UpdateManifest>`, []);
        validateTaskTest(`<UpdateManifest ApplicationManifest="" ApplicationPath="" InputManifest="" OutputManifest=""></UpdateManifest>`, []);
        validateTaskTest(`<UpdateManifest ApplicationManifest="" ApplicationPath="" InputManifest="" SPAM=""></UpdateManifest>`, [
            msbuild.Issues.invalidAttribute("UpdateManifest", "SPAM", new qub.Span(75, 7))
        ]);

        validateTaskTest(`<Vbc></Vbc>`, []);
        validateTaskTest(`<Vbc AdditionalLibPaths=""></Vbc>`, []);
        validateTaskTest(`<Vbc AddModules=""></Vbc>`, []);
        validateTaskTest(`<Vbc BaseAddress=""></Vbc>`, []);
        validateTaskTest(`<Vbc CodePage=""></Vbc>`, []);
        validateTaskTest(`<Vbc DebugType=""></Vbc>`, []);
        validateTaskTest(`<Vbc DefineConstants=""></Vbc>`, []);
        validateTaskTest(`<Vbc DelaySign=""></Vbc>`, []);
        validateTaskTest(`<Vbc DisabledWarnings=""></Vbc>`, []);
        validateTaskTest(`<Vbc DocumentationFile=""></Vbc>`, []);
        validateTaskTest(`<Vbc EmitDebugInformation=""></Vbc>`, []);
        validateTaskTest(`<Vbc ErrorReport=""></Vbc>`, []);
        validateTaskTest(`<Vbc FileAlignment=""></Vbc>`, []);
        validateTaskTest(`<Vbc GenerateDocumentation=""></Vbc>`, []);
        validateTaskTest(`<Vbc Imports=""></Vbc>`, []);
        validateTaskTest(`<Vbc KeyContainer=""></Vbc>`, []);
        validateTaskTest(`<Vbc KeyFile=""></Vbc>`, []);
        validateTaskTest(`<Vbc LangVersion=""></Vbc>`, []);
        validateTaskTest(`<Vbc LinkResources=""></Vbc>`, []);
        validateTaskTest(`<Vbc MainEntryPoint=""></Vbc>`, []);
        validateTaskTest(`<Vbc ModuleAssemblyName=""></Vbc>`, []);
        validateTaskTest(`<Vbc NoConfig=""></Vbc>`, []);
        validateTaskTest(`<Vbc NoLogo=""></Vbc>`, []);
        validateTaskTest(`<Vbc NoStandardLib=""></Vbc>`, []);
        validateTaskTest(`<Vbc NoVBRuntimeReference=""></Vbc>`, []);
        validateTaskTest(`<Vbc NoWarnings=""></Vbc>`, []);
        validateTaskTest(`<Vbc Optimize=""></Vbc>`, []);
        validateTaskTest(`<Vbc OptionCompare=""></Vbc>`, []);
        validateTaskTest(`<Vbc OptionExplicit=""></Vbc>`, []);
        validateTaskTest(`<Vbc OptionInfer=""></Vbc>`, []);
        validateTaskTest(`<Vbc OptionStrict=""></Vbc>`, []);
        validateTaskTest(`<Vbc OptionStrictType=""></Vbc>`, []);
        validateTaskTest(`<Vbc OutputAssembly=""></Vbc>`, []);
        validateTaskTest(`<Vbc Platform=""></Vbc>`, []);
        validateTaskTest(`<Vbc References=""></Vbc>`, []);
        validateTaskTest(`<Vbc RemoveIntegerChecks=""></Vbc>`, []);
        validateTaskTest(`<Vbc Resources=""></Vbc>`, []);
        validateTaskTest(`<Vbc ResponseFiles=""></Vbc>`, []);
        validateTaskTest(`<Vbc RootNamespace=""></Vbc>`, []);
        validateTaskTest(`<Vbc SdkPath=""></Vbc>`, []);
        validateTaskTest(`<Vbc Sources=""></Vbc>`, []);
        validateTaskTest(`<Vbc TargetCompactFramework=""></Vbc>`, []);
        validateTaskTest(`<Vbc TargetType=""></Vbc>`, []);
        validateTaskTest(`<Vbc Timeout=""></Vbc>`, []);
        validateTaskTest(`<Vbc ToolPath=""></Vbc>`, []);
        validateTaskTest(`<Vbc TreatWarningsAsErrors=""></Vbc>`, []);
        validateTaskTest(`<Vbc UseHostCompilerIfAvailable=""></Vbc>`, []);
        validateTaskTest(`<Vbc Utf8Output=""></Vbc>`, []);
        validateTaskTest(`<Vbc Verbosity=""></Vbc>`, []);
        validateTaskTest(`<Vbc WarningsAsErrors=""></Vbc>`, []);
        validateTaskTest(`<Vbc WarningsNotAsErrors=""></Vbc>`, []);
        validateTaskTest(`<Vbc Win32Icon=""></Vbc>`, []);
        validateTaskTest(`<Vbc Win32Resources=""></Vbc>`, []);
        validateTaskTest(`<Vbc SPAM=""></Vbc>`, [
            msbuild.Issues.invalidAttribute("Vbc", "SPAM", new qub.Span(5, 7))
        ]);

        validateTaskTest(`<VCMessage></VCMessage>`, [
            msbuild.Issues.missingRequiredAttribute("Code", new qub.Span(1, 9))
        ]);
        validateTaskTest(`<VCMessage Code=""></VCMessage>`, []);
        validateTaskTest(`<VCMessage Code="" Arguments=""></VCMessage>`, []);
        validateTaskTest(`<VCMessage Code="" Type=""></VCMessage>`, []);
        validateTaskTest(`<VCMessage Code="" SPAM=""></VCMessage>`, [
            msbuild.Issues.invalidAttribute("VCMessage", "SPAM", new qub.Span(19, 7))
        ]);

        validateTaskTest(`<Warning></Warning>`, []);
        validateTaskTest(`<Warning Code=""></Warning>`, []);
        validateTaskTest(`<Warning File=""></Warning>`, []);
        validateTaskTest(`<Warning HelpKeyword=""></Warning>`, []);
        validateTaskTest(`<Warning Text=""></Warning>`, []);
        validateTaskTest(`<Warning SPAM=""></Warning>`, [
            msbuild.Issues.invalidAttribute("Warning", "SPAM", new qub.Span(9, 7))
        ]);

        validateTaskTest(`<WriteCodeFragment></WriteCodeFragment>`, [
            msbuild.Issues.missingRequiredAttribute("Language", new qub.Span(1, 17))
        ]);
        validateTaskTest(`<WriteCodeFragment Language=""></WriteCodeFragment>`, []);
        validateTaskTest(`<WriteCodeFragment Language="" AssemblyAttributes=""></WriteCodeFragment>`, []);
        validateTaskTest(`<WriteCodeFragment Language="" OutputDirectory=""></WriteCodeFragment>`, []);
        validateTaskTest(`<WriteCodeFragment Language="" OutputFile=""></WriteCodeFragment>`, []);
        validateTaskTest(`<WriteCodeFragment Language="" SPAM=""></WriteCodeFragment>`, [
            msbuild.Issues.invalidAttribute("WriteCodeFragment", "SPAM", new qub.Span(31, 7))
        ]);

        validateTaskTest(`<WriteLinesToFile></WriteLinesToFile>`, [
            msbuild.Issues.missingRequiredAttribute("File", new qub.Span(1, 16))
        ]);
        validateTaskTest(`<WriteLinesToFile File=""></WriteLinesToFile>`, []);
        validateTaskTest(`<WriteLinesToFile File="" Lines=""></WriteLinesToFile>`, []);
        validateTaskTest(`<WriteLinesToFile File="" Overwrite=""></WriteLinesToFile>`, []);
        validateTaskTest(`<WriteLinesToFile File="" Encoding=""></WriteLinesToFile>`, []);
        validateTaskTest(`<WriteLinesToFile File="" SPAM=""></WriteLinesToFile>`, [
            msbuild.Issues.invalidAttribute("WriteLinesToFile", "SPAM", new qub.Span(26, 7))
        ]);

        validateTaskTest(`<XDCMake></XDCMake>`, [
            msbuild.Issues.missingRequiredAttribute("Sources", new qub.Span(1, 7))
        ]);
        validateTaskTest(`<XDCMake Sources=""></XDCMake>`, []);
        validateTaskTest(`<XDCMake Sources="" AdditionalDocumentFile=""></XDCMake>`, []);
        validateTaskTest(`<XDCMake Sources="" AdditionalOptions=""></XDCMake>`, []);
        validateTaskTest(`<XDCMake Sources="" DocumentLibraryDependencies=""></XDCMake>`, []);
        validateTaskTest(`<XDCMake Sources="" OutputFile=""></XDCMake>`, []);
        validateTaskTest(`<XDCMake Sources="" ProjectName=""></XDCMake>`, []);
        validateTaskTest(`<XDCMake Sources="" SlashOld=""></XDCMake>`, []);
        validateTaskTest(`<XDCMake Sources="" SuppressStartupBanner=""></XDCMake>`, []);
        validateTaskTest(`<XDCMake Sources="" TrackerLogDirectory=""></XDCMake>`, []);
        validateTaskTest(`<XDCMake Sources="" SPAM=""></XDCMake>`, [
            msbuild.Issues.invalidAttribute("XDCMake", "SPAM", new qub.Span(20, 7))
        ]);

        validateTaskTest(`<XmlPeek></XmlPeek>`, []);
        validateTaskTest(`<XmlPeek Namespaces=""></XmlPeek>`, []);
        validateTaskTest(`<XmlPeek Query=""></XmlPeek>`, []);
        validateTaskTest(`<XmlPeek Result=""></XmlPeek>`, []);
        validateTaskTest(`<XmlPeek XmlContent=""></XmlPeek>`, []);
        validateTaskTest(`<XmlPeek XmlInputPath=""></XmlPeek>`, []);
        validateTaskTest(`<XmlPeek SPAM=""></XmlPeek>`, [
            msbuild.Issues.invalidAttribute("XmlPeek", "SPAM", new qub.Span(9, 7))
        ]);

        validateTaskTest(`<XmlPoke></XmlPoke>`, [
            msbuild.Issues.missingRequiredAttribute("Value", new qub.Span(1, 7))
        ]);
        validateTaskTest(`<XmlPoke Value=""></XmlPoke>`, []);
        validateTaskTest(`<XmlPoke Value="" Namespaces=""></XmlPoke>`, []);
        validateTaskTest(`<XmlPoke Value="" Query=""></XmlPoke>`, []);
        validateTaskTest(`<XmlPoke Value="" XmlInputPath=""></XmlPoke>`, []);
        validateTaskTest(`<XmlPoke Value="" SPAM=""></XmlPoke>`, [
            msbuild.Issues.invalidAttribute("XmlPoke", "SPAM", new qub.Span(18, 7))
        ]);

        validateTaskTest(`<XSD></XSD>`, [
            msbuild.Issues.missingRequiredAttribute("Sources", new qub.Span(1, 3))
        ]);
        validateTaskTest(`<XSD Sources=""></XSD>`, []);
        validateTaskTest(`<XSD Sources="" AdditionalOptions=""></XSD>`, []);
        validateTaskTest(`<XSD Sources="" GenerateFromSchema=""></XSD>`, []);
        validateTaskTest(`<XSD Sources="" Language=""></XSD>`, []);
        validateTaskTest(`<XSD Sources="" Namespace=""></XSD>`, []);
        validateTaskTest(`<XSD Sources="" SuppressStartupBanner=""></XSD>`, []);
        validateTaskTest(`<XSD Sources="" TrackerLogDirectory=""></XSD>`, []);
        validateTaskTest(`<XSD Sources="" SPAM=""></XSD>`, [
            msbuild.Issues.invalidAttribute("XSD", "SPAM", new qub.Span(16, 7))
        ]);

        validateTaskTest(`<XslTransformation></XslTransformation>`, [
            msbuild.Issues.missingRequiredAttribute("OutputPaths", new qub.Span(1, 17))
        ]);
        validateTaskTest(`<XslTransformation OutputPaths=""></XslTransformation>`, []);
        validateTaskTest(`<XslTransformation OutputPaths="" Parameters=""></XslTransformation>`, []);
        validateTaskTest(`<XslTransformation OutputPaths="" XmlContent=""></XslTransformation>`, []);
        validateTaskTest(`<XslTransformation OutputPaths="" XmlInputPaths=""></XslTransformation>`, []);
        validateTaskTest(`<XslTransformation OutputPaths="" XslCompiledDllPath=""></XslTransformation>`, []);
        validateTaskTest(`<XslTransformation OutputPaths="" XslContent=""></XslTransformation>`, []);
        validateTaskTest(`<XslTransformation OutputPaths="" XslInputPath=""></XslTransformation>`, []);
        validateTaskTest(`<XslTransformation OutputPaths="" SPAM=""></XslTransformation>`, [
            msbuild.Issues.invalidAttribute("XslTransformation", "SPAM", new qub.Span(34, 7))
        ]);

        validateTaskTest(`<SPAM></SPAM>`, []);
        validateTaskTest(`<SPAM Condition=""></SPAM>`, []);
        validateTaskTest(`<SPAM Condition="$()"></SPAM>`, [
            msbuild.Issues.expectedPropertyName(new qub.Span(19, 1))
        ]);
        validateTaskTest(`<SPAM ContinueOnError=""></SPAM>`, []);
        validateTaskTest(`<SPAM Applesauce=""></SPAM>`, []);

        validateTaskTest(`<SPAM></SPAM>`, []);
        validateTaskTest(`<SPAM>    </SPAM>`, []);
        validateTaskTest(`<SPAM> a b c </SPAM>`, [
            msbuild.Issues.noTextSegmentsAllowed("Task", new qub.Span(7, 5))
        ]);
        validateTaskTest(`<SPAM>\na\nb\nc\n</SPAM>`, [
            msbuild.Issues.noTextSegmentsAllowed("Task", new qub.Span(7, 1)),
            msbuild.Issues.noTextSegmentsAllowed("Task", new qub.Span(9, 1)),
            msbuild.Issues.noTextSegmentsAllowed("Task", new qub.Span(11, 1))
        ]);

        validateTaskTest(`<SPAM><Output/></SPAM>`, [
            msbuild.Issues.missingRequiredAttribute("ItemName", new qub.Span(7, 6)),
            msbuild.Issues.missingRequiredAttribute("PropertyName", new qub.Span(7, 6)),
            msbuild.Issues.missingRequiredAttribute("TaskParameter", new qub.Span(7, 6))
        ]);
        validateTaskTest(`<SPAM><Bubblegum/></SPAM>`, [
            msbuild.Issues.invalidChildElement("Task", "Bubblegum", new qub.Span(6, 12))
        ]);
    });

    suite("validateTaskBody()", () => {
        function validateTaskBodyTest(elementText: string, expectedIssues: qub.Issue[]): void {
            test(`with ${qub.escapeAndQuote(elementText)}`, () => {
                const issues = new qub.ArrayList<qub.Issue>();
                msbuild.validateTaskBody(parseXmlElement(elementText), issues);
                assert.deepStrictEqual(issues.toArray(), expectedIssues);
            });
        }

        validateTaskBodyTest(`<TaskBody></TaskBody>`, []);
        validateTaskBodyTest(`<TaskBody Evaluate=""></TaskBody>`, []);
        validateTaskBodyTest(`<TaskBody SPAM=""></TaskBody>`, [
            msbuild.Issues.invalidAttribute("TaskBody", "SPAM", new qub.Span(10, 7))
        ]);

        validateTaskBodyTest(`<TaskBody>    </TaskBody>`, []);
        validateTaskBodyTest(`<TaskBody> a b c </TaskBody>`, [
            msbuild.Issues.noTextSegmentsAllowed("TaskBody", new qub.Span(11, 5))
        ]);
        validateTaskBodyTest(`<TaskBody>\na\nb\nc\n</TaskBody>`, [
            msbuild.Issues.noTextSegmentsAllowed("TaskBody", new qub.Span(11, 1)),
            msbuild.Issues.noTextSegmentsAllowed("TaskBody", new qub.Span(13, 1)),
            msbuild.Issues.noTextSegmentsAllowed("TaskBody", new qub.Span(15, 1))
        ]);

        validateTaskBodyTest(`<TaskBody><SPAM/></TaskBody>`, [
            msbuild.Issues.invalidChildElement("TaskBody", "SPAM", new qub.Span(10, 7))
        ]);
    });

    suite("validateUsingTask()", () => {
        function validateUsingTaskTest(elementText: string, expectedIssues: qub.Issue[]): void {
            test(`with ${qub.escapeAndQuote(elementText)}`, () => {
                const issues = new qub.ArrayList<qub.Issue>();
                msbuild.validateUsingTask(parseXmlElement(elementText), issues);
                assert.deepStrictEqual(issues.toArray(), expectedIssues);
            });
        }

        validateUsingTaskTest(`<UsingTask></UsingTask>`, [
            msbuild.Issues.missingRequiredAttribute("AssemblyFile", new qub.Span(1, 9)),
            msbuild.Issues.missingRequiredAttribute("AssemblyName", new qub.Span(1, 9)),
            msbuild.Issues.missingRequiredAttribute("TaskName", new qub.Span(1, 9))
        ]);
        validateUsingTaskTest(`<UsingTask AssemblyFile=""></UsingTask>`, [
            msbuild.Issues.missingRequiredAttribute("TaskName", new qub.Span(1, 9))
        ]);
        validateUsingTaskTest(`<UsingTask AssemblyName=""></UsingTask>`, [
            msbuild.Issues.missingRequiredAttribute("TaskName", new qub.Span(1, 9))
        ]);
        validateUsingTaskTest(`<UsingTask AssemblyFile="" AssemblyName=""></UsingTask>`, [
            msbuild.Issues.attributeCantBeDefinedWith("AssemblyFile", "AssemblyName", new qub.Span(11, 12)),
            msbuild.Issues.attributeCantBeDefinedWith("AssemblyName", "AssemblyFile", new qub.Span(27, 12)),
            msbuild.Issues.missingRequiredAttribute("TaskName", new qub.Span(1, 9))
        ]);
        validateUsingTaskTest(`<UsingTask AssemblyFile="" TaskName=""></UsingTask>`, []);
        validateUsingTaskTest(`<UsingTask AssemblyFile="" TaskName="" Condition=""></UsingTask>`, []);
        validateUsingTaskTest(`<UsingTask AssemblyFile="" TaskName="" TaskFactory=""></UsingTask>`, []);
        validateUsingTaskTest(`<UsingTask AssemblyFile="" TaskName="" SPAM=""></UsingTask>`, [
            msbuild.Issues.invalidAttribute("UsingTask", "SPAM", new qub.Span(39, 7))
        ]);

        validateUsingTaskTest(`<UsingTask AssemblyFile="" TaskName="">    </UsingTask>`, []);
        validateUsingTaskTest(`<UsingTask AssemblyFile="" TaskName=""> a b c </UsingTask>`, [
            msbuild.Issues.noTextSegmentsAllowed("UsingTask", new qub.Span(40, 5))
        ]);
        validateUsingTaskTest(`<UsingTask AssemblyFile="" TaskName="">\na\nb\nc\n</UsingTask>`, [
            msbuild.Issues.noTextSegmentsAllowed("UsingTask", new qub.Span(40, 1)),
            msbuild.Issues.noTextSegmentsAllowed("UsingTask", new qub.Span(42, 1)),
            msbuild.Issues.noTextSegmentsAllowed("UsingTask", new qub.Span(44, 1))
        ]);

        validateUsingTaskTest(`<UsingTask AssemblyName="" TaskName=""><ParameterGroup/></UsingTask>`, []);
        validateUsingTaskTest(`<UsingTask AssemblyName="" TaskName=""><TaskBody/></UsingTask>`, []);
        validateUsingTaskTest(`<UsingTask AssemblyName="" TaskName=""><SPAM/></UsingTask>`, [
            msbuild.Issues.invalidChildElement("UsingTask", "SPAM", new qub.Span(39, 7))
        ]);
    });

    suite("validateWhen()", () => {
        function validateWhenTest(elementText: string, expectedIssues: qub.Issue[]): void {
            test(`with ${qub.escapeAndQuote(elementText)}`, () => {
                const issues = new qub.ArrayList<qub.Issue>();
                msbuild.validateWhen(parseXmlElement(elementText), issues);
                assert.deepStrictEqual(issues.toArray(), expectedIssues);
            });
        }

        validateWhenTest(`<When></When>`, [
            msbuild.Issues.missingRequiredAttribute("Condition", new qub.Span(1, 4))
        ]);
        validateWhenTest(`<When Condition=""></When>`, []);
        validateWhenTest(`<When Condition="true"></When>`, []);
        validateWhenTest(`<When Condition="$()"></When>`, [
            msbuild.Issues.expectedPropertyName(new qub.Span(19, 1))
        ]);
        validateWhenTest(`<When Condition="" SPAM=""></When>`, [
            msbuild.Issues.invalidAttribute("When", "SPAM", new qub.Span(19, 7))
        ]);

        validateWhenTest(`<When Condition="">    </When>`, []);
        validateWhenTest(`<When Condition=""> a b c </When>`, [
            msbuild.Issues.noTextSegmentsAllowed("When", new qub.Span(20, 5))
        ]);
        validateWhenTest(`<When Condition="">\na\nb\nc\n</When>`, [
            msbuild.Issues.noTextSegmentsAllowed("When", new qub.Span(20, 1)),
            msbuild.Issues.noTextSegmentsAllowed("When", new qub.Span(22, 1)),
            msbuild.Issues.noTextSegmentsAllowed("When", new qub.Span(24, 1))
        ]);

        validateWhenTest(`<When Condition=""><Choose/></When>`, [
            msbuild.Issues.missingRequiredChildElement("Choose", "When", new qub.Span(20, 6))
        ]);
        validateWhenTest(`<When Condition=""><ItemGroup/></When>`, []);
        validateWhenTest(`<When Condition=""><PropertyGroup/></When>`, []);
        validateWhenTest(`<When Condition=""><SPAM/></UsingTask>`, [
            msbuild.Issues.invalidChildElement("When", "SPAM", new qub.Span(19, 7))
        ]);
    });

    suite("parseCondition()", () => {
        function parseConditionTest(conditionText: string, expectedExpression?: msbuild.Expression, expectedIssues: qub.Issue[] = []): void {
            test(`with ${qub.escapeAndQuote(conditionText)}`, () => {
                const issues = new qub.ArrayList<qub.Issue>();
                const lexer = new xml.Lexer(conditionText);
                const expression: msbuild.Expression = msbuild.parseCondition(lexer, issues);
                assert.deepStrictEqual(expression, expectedExpression);
                assert.deepStrictEqual(issues.toArray(), expectedIssues);
            });
        }

        parseConditionTest(undefined);
        parseConditionTest(null);
        parseConditionTest("");

        parseConditionTest("Hello", parseUnquotedStringExpression("Hello"));
        parseConditionTest("123", parseUnquotedStringExpression("123"));
        parseConditionTest(" ", parseUnquotedStringExpression(" "));
        parseConditionTest("I'm here!",
            new msbuild.ConcatenateExpression(
                parseUnquotedStringExpression("I"),
                new msbuild.QuotedStringExpression(
                    xml.SingleQuote(1),
                    new msbuild.ConcatenateExpression(
                        parseUnquotedStringExpression("m here", 2),
                        new msbuild.PrefixExpression(
                            parseNegateOperator("!", 8),
                            undefined)),
                    undefined)),
            [
                msbuild.Issues.missingExpression(new qub.Span(8, 1)),
                msbuild.Issues.missingEndQuote("'", new qub.Span(1, 1))
            ]);

        parseConditionTest("$", parseUnquotedStringExpression("$"));
        parseConditionTest("$(", parseUnquotedStringExpression("$("), [
            msbuild.Issues.missingPropertyName(new qub.Span(1, 1)),
            msbuild.Issues.missingRightParenthesis(new qub.Span(1, 1))
        ]);
        parseConditionTest("$()", parsePropertyExpression("$()"), [
            msbuild.Issues.expectedPropertyName(new qub.Span(2, 1))
        ]);
        parseConditionTest("$(#)", parsePropertyExpression("$(#)"), [
            msbuild.Issues.invalidPropertyNameCharacter("#", new qub.Span(2, 1))
        ]);
        parseConditionTest("$(Hello there!)", parsePropertyExpression("$(Hello there!)"), [
            msbuild.Issues.invalidPropertyNameCharacter(" ", new qub.Span(7, 1)),
            msbuild.Issues.invalidPropertyNameCharacter("!", new qub.Span(13, 1))
        ]);
        parseConditionTest("$(test)", parsePropertyExpression("$(test)"));
        parseConditionTest("$(test", parseUnquotedStringExpression("$(test"), [
            msbuild.Issues.missingRightParenthesis(new qub.Span(1, 1))
        ]);

        parseConditionTest("a$(b)",
            new msbuild.ConcatenateExpression(
                parseUnquotedStringExpression("a"),
                parsePropertyExpression("$(b)", 1)));
        parseConditionTest("$(b)c",
            new msbuild.ConcatenateExpression(
                parsePropertyExpression("$(b)"),
                parseUnquotedStringExpression("c", 4)));
        parseConditionTest("a$(b)c",
            new msbuild.ConcatenateExpression(
                new msbuild.ConcatenateExpression(
                    parseUnquotedStringExpression("a"),
                    parsePropertyExpression("$(b)", 1)),
                parseUnquotedStringExpression("c", 5)));
        parseConditionTest("$(Jack) and $(Jill)",
            new msbuild.ConcatenateExpression(
                new msbuild.ConcatenateExpression(
                    parsePropertyExpression("$(Jack)"),
                    parseUnquotedStringExpression(" and ", 7)),
                parsePropertyExpression("$(Jill)", 12)));

        parseConditionTest("!",
            new msbuild.PrefixExpression(
                parseNegateOperator("!"),
                undefined),
            [
                msbuild.Issues.missingExpression(new qub.Span(0, 1))
            ]);
        parseConditionTest("!false",
            new msbuild.PrefixExpression(
                parseNegateOperator("!"),
                parseUnquotedStringExpression("false", 1)),
            []);
        parseConditionTest("!'true'",
            new msbuild.PrefixExpression(
                parseNegateOperator("!"),
                new msbuild.QuotedStringExpression(
                    xml.SingleQuote(1),
                    parseUnquotedStringExpression("true", 2),
                    xml.SingleQuote(6))),
            []);
        parseConditionTest("!!true",
            new msbuild.PrefixExpression(
                parseNegateOperator("!"),
                new msbuild.PrefixExpression(
                    parseNegateOperator("!", 1),
                    parseUnquotedStringExpression("true", 2))),
            []);
        parseConditionTest("!A==!B",
            new msbuild.BinaryExpression(
                new msbuild.PrefixExpression(
                    parseNegateOperator("!"),
                    parseUnquotedStringExpression("A", 1)),
                parseEqualsOperator("==", 2),
                new msbuild.PrefixExpression(
                    parseNegateOperator("!", 4),
                    parseUnquotedStringExpression("B", 5))),
            []);

        parseConditionTest("!=",
            new msbuild.BinaryExpression(undefined, parseNotEqualsOperator("!="), undefined),
            [
                msbuild.Issues.expectedLeftExpression(new qub.Span(0, 2)),
                msbuild.Issues.missingRightExpression(new qub.Span(0, 2))
            ]);
        parseConditionTest(" !=",
            new msbuild.BinaryExpression(
                parseUnquotedStringExpression(" "),
                parseNotEqualsOperator("!=", 1),
                undefined),
            [
                msbuild.Issues.expectedLeftExpression(new qub.Span(1, 2)),
                msbuild.Issues.missingRightExpression(new qub.Span(1, 2))
            ]);
        parseConditionTest(" != ",
            new msbuild.BinaryExpression(
                parseUnquotedStringExpression(" "),
                parseNotEqualsOperator("!=", 1),
                parseUnquotedStringExpression(" ", 3)),
            [
                msbuild.Issues.expectedLeftExpression(new qub.Span(1, 2)),
                msbuild.Issues.missingRightExpression(new qub.Span(1, 2))
            ]);
        parseConditionTest("500!",
            new msbuild.ConcatenateExpression(
                parseUnquotedStringExpression("500"),
                new msbuild.PrefixExpression(parseNegateOperator("!", 3), undefined)),
            [
                msbuild.Issues.missingExpression(new qub.Span(3, 1))
            ]);
        parseConditionTest("500=!",
            new msbuild.BinaryExpression(
                parseUnquotedStringExpression("500"),
                parseEqualsOperator("=", 3),
                new msbuild.PrefixExpression(parseNegateOperator("!", 4), undefined)),
            [
                msbuild.Issues.expectedSecondEqualsSign(new qub.Span(4, 1)),
                msbuild.Issues.missingExpression(new qub.Span(4, 1))
            ]);
        parseConditionTest("500 !=",
            new msbuild.BinaryExpression(
                parseUnquotedStringExpression("500 "),
                parseNotEqualsOperator("!=", 4),
                undefined),
            [msbuild.Issues.missingRightExpression(new qub.Span(4, 2))]);
        parseConditionTest("!=1",
            new msbuild.BinaryExpression(
                undefined,
                parseNotEqualsOperator("!="),
                parseUnquotedStringExpression("1", 2)),
            [msbuild.Issues.expectedLeftExpression(new qub.Span(0, 2))]);
        parseConditionTest(" !=1",
            new msbuild.BinaryExpression(
                parseUnquotedStringExpression(" "),
                parseNotEqualsOperator("!=", 1),
                parseUnquotedStringExpression("1", 3)),
            [msbuild.Issues.expectedLeftExpression(new qub.Span(1, 2))]);
        parseConditionTest("500!=500",
            new msbuild.BinaryExpression(
                parseUnquotedStringExpression("500"),
                parseNotEqualsOperator("!=", 3),
                parseUnquotedStringExpression("500", 5)));
        parseConditionTest("'$(Prop)' != ''",
            new msbuild.BinaryExpression(
                new msbuild.ConcatenateExpression(
                    new msbuild.QuotedStringExpression(
                        xml.SingleQuote(0),
                        parsePropertyExpression("$(Prop)", 1),
                        xml.SingleQuote(8)),
                    parseUnquotedStringExpression(" ", 9)),
                parseNotEqualsOperator("!=", 10),
                new msbuild.ConcatenateExpression(
                    parseUnquotedStringExpression(" ", 12),
                    new msbuild.QuotedStringExpression(
                        xml.SingleQuote(13),
                        undefined,
                        xml.SingleQuote(14)))));
        parseConditionTest("!A!=!B",
            new msbuild.BinaryExpression(
                new msbuild.PrefixExpression(
                    parseNegateOperator("!"),
                    parseUnquotedStringExpression("A", 1)),
                parseEqualsOperator("!=", 2),
                new msbuild.PrefixExpression(
                    parseNegateOperator("!", 4),
                    parseUnquotedStringExpression("B", 5))),
            []);
        parseConditionTest("A==B!=C",
            new msbuild.BinaryExpression(
                new msbuild.BinaryExpression(
                    parseUnquotedStringExpression("A"),
                    parseEqualsOperator("==", 1),
                    parseUnquotedStringExpression("B", 3)),
                parseNotEqualsOperator("!=", 4),
                parseUnquotedStringExpression("C", 6)));

        parseConditionTest("=",
            new msbuild.BinaryExpression(undefined, parseEqualsOperator("="), undefined),
            [
                msbuild.Issues.missingSecondEqualsSign(new qub.Span(0, 1)),
                msbuild.Issues.expectedLeftExpression(new qub.Span(0, 1)),
                msbuild.Issues.missingRightExpression(new qub.Span(0, 1))
            ]);
        parseConditionTest("==",
            new msbuild.BinaryExpression(undefined, parseEqualsOperator("=="), undefined),
            [
                msbuild.Issues.expectedLeftExpression(new qub.Span(0, 2)),
                msbuild.Issues.missingRightExpression(new qub.Span(0, 2))
            ]);
        parseConditionTest(" ==",
            new msbuild.BinaryExpression(
                parseUnquotedStringExpression(" "),
                parseEqualsOperator("==", 1),
                undefined),
            [
                msbuild.Issues.expectedLeftExpression(new qub.Span(1, 2)),
                msbuild.Issues.missingRightExpression(new qub.Span(1, 2))
            ]);
        parseConditionTest(" == ",
            new msbuild.BinaryExpression(
                parseUnquotedStringExpression(" "),
                parseEqualsOperator("==", 1),
                parseUnquotedStringExpression(" ", 3)),
            [
                msbuild.Issues.expectedLeftExpression(new qub.Span(1, 2)),
                msbuild.Issues.missingRightExpression(new qub.Span(1, 2))
            ]);
        parseConditionTest("500=",
            new msbuild.BinaryExpression(
                parseUnquotedStringExpression("500"),
                parseEqualsOperator("=", 3),
                undefined),
            [
                msbuild.Issues.missingSecondEqualsSign(new qub.Span(3, 1)),
                msbuild.Issues.missingRightExpression(new qub.Span(3, 1))
            ]);
        parseConditionTest("500 ==",
            new msbuild.BinaryExpression(
                parseUnquotedStringExpression("500 "),
                parseEqualsOperator("==", 4),
                undefined),
            [msbuild.Issues.missingRightExpression(new qub.Span(4, 2))]);
        parseConditionTest("==1",
            new msbuild.BinaryExpression(
                undefined,
                parseEqualsOperator("=="),
                parseUnquotedStringExpression("1", 2)),
            [msbuild.Issues.expectedLeftExpression(new qub.Span(0, 2))]);
        parseConditionTest(" ==1",
            new msbuild.BinaryExpression(
                parseUnquotedStringExpression(" "),
                parseEqualsOperator("==", 1),
                parseUnquotedStringExpression("1", 3)),
            [msbuild.Issues.expectedLeftExpression(new qub.Span(1, 2))]);
        parseConditionTest("500==500",
            new msbuild.BinaryExpression(
                parseUnquotedStringExpression("500"),
                parseEqualsOperator("==", 3),
                parseUnquotedStringExpression("500", 5)));
        parseConditionTest("'$(Prop)' == ''",
            new msbuild.BinaryExpression(
                new msbuild.ConcatenateExpression(
                    new msbuild.QuotedStringExpression(
                        xml.SingleQuote(0),
                        parsePropertyExpression("$(Prop)", 1),
                        xml.SingleQuote(8)),
                    parseUnquotedStringExpression(" ", 9)),
                parseEqualsOperator("==", 10),
                new msbuild.ConcatenateExpression(
                    parseUnquotedStringExpression(" ", 12),
                    new msbuild.QuotedStringExpression(
                        xml.SingleQuote(13),
                        undefined,
                        xml.SingleQuote(14)))));

        parseConditionTest("@", parseUnquotedStringExpression("@"));
        parseConditionTest("@(", parseItemExpression("@("), [
            msbuild.Issues.missingItemName(new qub.Span(1, 1)),
            msbuild.Issues.missingRightParenthesis(new qub.Span(1, 1))
        ]);
        parseConditionTest("@()", parseItemExpression("@()"), [
            msbuild.Issues.expectedItemName(new qub.Span(2, 1))
        ]);
        parseConditionTest("@(#)", parseItemExpression("@(#)"), [
            msbuild.Issues.invalidItemNameCharacter("#", new qub.Span(2, 1))
        ]);
        parseConditionTest("@(Hello there!)", parseItemExpression("@(Hello there!)"), [
            msbuild.Issues.invalidItemNameCharacter(" ", new qub.Span(7, 1)),
            msbuild.Issues.invalidItemNameCharacter("!", new qub.Span(13, 1))
        ]);
        parseConditionTest("@(test)", parseItemExpression("@(test)"));
        parseConditionTest("@(test", parseItemExpression("@(test"), [
            msbuild.Issues.missingRightParenthesis(new qub.Span(1, 1))
        ]);
    });

    suite("parseExpression()", () => {
        function parseExpressionTest(expressionText: string, expectedExpression?: msbuild.Expression, expectedIssues: qub.Issue[] = []): void {
            test(`with ${qub.escapeAndQuote(expressionText)}`, () => {
                const issues = new qub.ArrayList<qub.Issue>();
                const expression: msbuild.Expression = msbuild.parseExpression(false, new xml.Lexer(expressionText), issues);
                assert.deepStrictEqual(expression, expectedExpression);
                assert.deepStrictEqual(issues.toArray(), expectedIssues);
            });
        }

        parseExpressionTest(null);
        parseExpressionTest(undefined);
        parseExpressionTest("");

        parseExpressionTest("Hello", parseUnquotedStringExpression("Hello"));
        parseExpressionTest("123", parseUnquotedStringExpression("123"));
        parseExpressionTest(" ", parseUnquotedStringExpression(" "));
        parseExpressionTest("I'm here!", parseUnquotedStringExpression("I'm here!"));

        parseExpressionTest("$", parseUnquotedStringExpression("$"));
        parseExpressionTest("$(", parseUnquotedStringExpression("$("), [
            msbuild.Issues.missingPropertyName(new qub.Span(1, 1)),
            msbuild.Issues.missingRightParenthesis(new qub.Span(1, 1))
        ]);
        parseExpressionTest("$()", parsePropertyExpression("$()"), [
            msbuild.Issues.expectedPropertyName(new qub.Span(2, 1))
        ]);
        parseExpressionTest("$(#)", parsePropertyExpression("$(#)"), [
            msbuild.Issues.invalidPropertyNameCharacter("#", new qub.Span(2, 1))
        ]);
        parseExpressionTest("$(Hello there!)", parsePropertyExpression("$(Hello there!)"), [
            msbuild.Issues.invalidPropertyNameCharacter(" ", new qub.Span(7, 1)),
            msbuild.Issues.invalidPropertyNameCharacter("!", new qub.Span(13, 1))
        ]);
        parseExpressionTest("$(test)", parsePropertyExpression("$(test)"));
        parseExpressionTest("$(test", parseUnquotedStringExpression("$(test"), [
            msbuild.Issues.missingRightParenthesis(new qub.Span(1, 1))
        ]);

        parseExpressionTest("a$(b)",
            new msbuild.ConcatenateExpression(
                parseUnquotedStringExpression("a"),
                parsePropertyExpression("$(b)", 1)));
        parseExpressionTest("$(b)c",
            new msbuild.ConcatenateExpression(
                parsePropertyExpression("$(b)"),
                parseUnquotedStringExpression("c", 4)));
        parseExpressionTest("a$(b)c",
            new msbuild.ConcatenateExpression(
                new msbuild.ConcatenateExpression(
                    parseUnquotedStringExpression("a"),
                    parsePropertyExpression("$(b)", 1)),
                parseUnquotedStringExpression("c", 5)));
        parseExpressionTest("$(Jack) and $(Jill)",
            new msbuild.ConcatenateExpression(
                new msbuild.ConcatenateExpression(
                    parsePropertyExpression("$(Jack)"),
                    parseUnquotedStringExpression(" and ", 7)),
                parsePropertyExpression("$(Jill)", 12)));

        parseExpressionTest("500==500",
            parseUnquotedStringExpression("500==500"));

        parseExpressionTest("@", parseUnquotedStringExpression("@"));
        parseExpressionTest("@(", parseItemExpression("@("), [
            msbuild.Issues.missingItemName(new qub.Span(1, 1)),
            msbuild.Issues.missingRightParenthesis(new qub.Span(1, 1))
        ]);
        parseExpressionTest("@()", parseItemExpression("@()"), [
            msbuild.Issues.expectedItemName(new qub.Span(2, 1))
        ]);
        parseExpressionTest("@(#)", parseItemExpression("@(#)"), [
            msbuild.Issues.invalidItemNameCharacter("#", new qub.Span(2, 1))
        ]);
        parseExpressionTest("@(Hello there!)", parseItemExpression("@(Hello there!)"), [
            msbuild.Issues.invalidItemNameCharacter(" ", new qub.Span(7, 1)),
            msbuild.Issues.invalidItemNameCharacter("!", new qub.Span(13, 1))
        ]);
        parseExpressionTest("@(test)", parseItemExpression("@(test)"));
        parseExpressionTest("@(test", parseItemExpression("@(test"), [
            msbuild.Issues.missingRightParenthesis(new qub.Span(1, 1))
        ]);
    });

    suite("parse()", () => {
        test("with undefined", () => {
            const document: msbuild.Document = msbuild.parse(undefined);
            assert.deepStrictEqual(document, new msbuild.Document(xml.parse(undefined)));
        });

        test("with null", () => {
            const document: msbuild.Document = msbuild.parse(null);
            assert.deepStrictEqual(document, new msbuild.Document(xml.parse(null)));
        });

        test(`with ""`, () => {
            const document: msbuild.Document = msbuild.parse("");
            assert.deepStrictEqual(document, new msbuild.Document(xml.parse("")));
        });

        test(`with "<?xml?>"`, () => {
            const document: msbuild.Document = msbuild.parse("<?xml?>");
            assert.deepStrictEqual(document, new msbuild.Document(xml.parse("<?xml?>")));
            assert.deepStrictEqual(document.issues.toArray(), [
                xml.Issues.expectedDeclarationVersionAttribute(new qub.Span(5, 1))
            ]);
        });

        function parseTest(documentText: string, expectedIssues: qub.Issue[] = []): void {
            test(`with ${qub.escapeAndQuote(documentText)}`, () => {
                const document: msbuild.Document = msbuild.parse(documentText);
                const expectedDocument = new msbuild.Document(xml.parse(documentText), new qub.ArrayList(expectedIssues));
                assert.deepStrictEqual(qub.isDefined(document), qub.isDefined(expectedDocument), "Wrong document is defined");
                if (expectedDocument) {
                    assert.deepStrictEqual(document.project, expectedDocument.project, "Wrong project");
                    assert.deepStrictEqual(qub.isDefined(document.issues), qub.isDefined(expectedDocument.issues), "Wrong issues is defined");
                    if (expectedDocument.issues) {
                        assert.deepStrictEqual(document.issues.toArray(), expectedIssues, "Wrong issues");
                    }
                }
            });
        }

        parseTest("<", [
            xml.Issues.missingNameQuestionMarkExclamationPointOrForwardSlash(new qub.Span(0, 1)),
            xml.Issues.missingTagRightAngleBracket(new qub.Span(0, 1))
        ]);
        parseTest("<>", [
            xml.Issues.expectedNameQuestionMarkExclamationPointOrForwardSlash(new qub.Span(1, 1))
        ]);

        parseTest(`<a></a>`, [
            msbuild.Issues.expectedProjectElement(new qub.Span(0, 7))
        ]);
        parseTest(`<a/>`, [
            msbuild.Issues.expectedProjectElement(new qub.Span(0, 4))
        ]);

        parseTest(`<![CDATA[]]>`, [
            xml.Issues.documentCannotHaveCDATAAtRootLevel(new qub.Span(0, 12))
        ]);

        // Project Attributes
        parseTest(`<project/>`, [
            msbuild.Issues.missingRequiredAttribute("Xmlns", new qub.Span(1, 7))
        ]);
        parseTest(`<Project/>`, [
            msbuild.Issues.missingRequiredAttribute("Xmlns", new qub.Span(1, 7))
        ]);
        parseTest(`<project/><project/>`, [
            xml.Issues.documentCanHaveOneRootElement(new qub.Span(10, 10)),
            msbuild.Issues.missingRequiredAttribute("Xmlns", new qub.Span(1, 7)),
            msbuild.Issues.missingRequiredAttribute("Xmlns", new qub.Span(11, 7))
        ]);
        parseTest(`<Project/><Project/>`, [
            xml.Issues.documentCanHaveOneRootElement(new qub.Span(10, 10)),
            msbuild.Issues.missingRequiredAttribute("Xmlns", new qub.Span(1, 7)),
            msbuild.Issues.missingRequiredAttribute("Xmlns", new qub.Span(11, 7))
        ]);
        parseTest(`<a/><project/>`, [
            xml.Issues.documentCanHaveOneRootElement(new qub.Span(4, 10)),
            msbuild.Issues.expectedProjectElement(new qub.Span(0, 4)),
            msbuild.Issues.missingRequiredAttribute("Xmlns", new qub.Span(5, 7))
        ]);
        parseTest(`<project defaulttargets="a" initialtargets="b" toolsversion="c" treataslocalproperty="d" xmlns="e"/>`);
        parseTest(`<Project DefaultTargets="a" InitialTargets="b" ToolsVersion="c" TreatAsLocalProperty="d" Xmlns="e"/>`);
        parseTest(`<Project DefaultTargets="a" DefaultTargets="b"/>`, [
            msbuild.Issues.missingRequiredAttribute("Xmlns", new qub.Span(1, 7))
        ]);
        parseTest(`<Project InitialTargets="a" InitialTargets="b"/>`, [
            msbuild.Issues.missingRequiredAttribute("Xmlns", new qub.Span(1, 7))
        ]);
        parseTest(`<Project ToolsVersion="a" ToolsVersion="b"/>`, [
            msbuild.Issues.missingRequiredAttribute("Xmlns", new qub.Span(1, 7))
        ]);
        parseTest(`<Project TreatAsLocalProperty="a" TreatAsLocalProperty="b"/>`, [
            msbuild.Issues.missingRequiredAttribute("Xmlns", new qub.Span(1, 7))
        ]);
        parseTest(`<Project Xmlns="a" Xmlns="b"/>`);
        parseTest(`<Project bubblegum="a"/>`, [
            msbuild.Issues.invalidAttribute("Project", "bubblegum", new qub.Span(9, 13)),
            msbuild.Issues.missingRequiredAttribute("Xmlns", new qub.Span(1, 7))
        ]);

        // Project children
        parseTest(`<Project xmlns=""><SPAM/></Project>`, [
            msbuild.Issues.invalidChildElement("Project", "SPAM", new qub.Span(18, 7))
        ]);
        parseTest(`<Project xmlns="">hello</Project>`, [
            msbuild.Issues.noTextSegmentsAllowed("Project", new qub.Span(18, 5))
        ]);
        parseTest(`<Project xmlns="">  </Project>`);
        parseTest(`<Project xmlns=""> hello </Project>`, [
            msbuild.Issues.noTextSegmentsAllowed("Project", new qub.Span(19, 5))
        ]);
        parseTest(`<Project xmlns=""><Choose/></Project>`, [
            msbuild.Issues.missingRequiredChildElement("Choose", "When", new qub.Span(19, 6))
        ]);
        parseTest(`<Project xmlns=""><Choose></Choose></Project>`, [
            msbuild.Issues.missingRequiredChildElement("Choose", "When", new qub.Span(19, 6))
        ]);
        parseTest(`<Project xmlns=""><PropertyGroup/></Project>`);
        parseTest(`<Project xmlns=""><PropertyGroup></PropertyGroup></Project>`);
        parseTest(`<Project xmlns=""><Import/></Project>`, [
            msbuild.Issues.missingRequiredAttribute("Project", new qub.Span(19, 6))
        ]);
        parseTest(`<Project xmlns=""><ItemGroup/></Project>`);

        // Choose attributes
        parseTest(`<Project xmlns=""><Choose Apples=""/></Project>`, [
            msbuild.Issues.invalidAttribute("Choose", "Apples", new qub.Span(26, 9)),
            msbuild.Issues.missingRequiredChildElement("Choose", "When", new qub.Span(19, 6))
        ]);

        // Choose children
        parseTest(`<Project xmlns=""><Choose>    </Choose></Project>`, [
            msbuild.Issues.missingRequiredChildElement("Choose", "When", new qub.Span(19, 6))
        ]);
        parseTest(`<Project xmlns=""><Choose>  oranges and bananas  </Choose></Project>`, [
            msbuild.Issues.noTextSegmentsAllowed("Choose", new qub.Span(28, 19)),
            msbuild.Issues.missingRequiredChildElement("Choose", "When", new qub.Span(19, 6))
        ]);
        parseTest(`<Project xmlns=""><Choose><SPAM/></Choose></Project>`, [
            msbuild.Issues.invalidChildElement("Choose", "SPAM", new qub.Span(26, 7)),
            msbuild.Issues.missingRequiredChildElement("Choose", "When", new qub.Span(19, 6))
        ]);
        parseTest(`<Project xmlns=""><Choose><When Condition=""/></Choose></Project>`);
        parseTest(`<Project xmlns=""><Choose><When Condition=""/><When Condition=""></When></Choose></Project>`);
        parseTest(`<Project xmlns=""><Choose><When Condition=""/><Otherwise/></Choose></Project>`);
        parseTest(`<Project xmlns=""><Choose><When Condition=""/><Otherwise/><Otherwise></Otherwise></Choose></Project>`, [
            msbuild.Issues.invalidLastChildElement("Choose", "Otherwise", new qub.Span(46, 12)),
            msbuild.Issues.atMostOneChildElement("Choose", "Otherwise", new qub.Span(58, 23))
        ]);

        // Import attributes
        parseTest(`<Project xmlns=""><Import Project=""/></Project>`);
        parseTest(`<Project xmlns=""><Import Project="" Condition="" /></Project>`);
        parseTest(`<Project xmlns=""><Import SPAM=""/></Project>`, [
            msbuild.Issues.invalidAttribute("Import", "SPAM", new qub.Span(26, 7)),
            msbuild.Issues.missingRequiredAttribute("Project", new qub.Span(19, 6))
        ]);

        // Import children
        parseTest(`<Project xmlns=""><Import Project="">    </Import></Project>`);
        parseTest(`<Project xmlns=""><Import Project="">  test  </Import></Project>`, [
            msbuild.Issues.noTextSegmentsAllowed("Import", new qub.Span(39, 4))
        ]);
        parseTest(`<Project xmlns=""><Import Project="">  <SPAM/>  </Import></Project>`, [
            msbuild.Issues.invalidChildElement("Import", "SPAM", new qub.Span(39, 7))
        ]);

        // ItemGroup attributes
        parseTest(`<Project xmlns=""><ItemGroup Condition=""/></Project>`);
        parseTest(`<Project xmlns=""><ItemGroup Label=""/></Project>`);
        parseTest(`<Project xmlns=""><ItemGroup SPAM=""/></Project>`, [
            msbuild.Issues.invalidAttribute("ItemGroup", "SPAM", new qub.Span(29, 7))
        ]);

        // ItemGroup children

        // When attributes
        parseTest(`<Project xmlns=""><Choose><When/></Choose></Project>`, [
            msbuild.Issues.missingRequiredAttribute("Condition", new qub.Span(27, 4))
        ]);
        parseTest(`<Project xmlns=""><Choose><When></When></Choose></Project>`, [
            msbuild.Issues.missingRequiredAttribute("Condition", new qub.Span(27, 4))
        ]);
        parseTest(`<Project xmlns=""><Choose><When Condition=""/></Choose></Project>`);
        parseTest(`<Project xmlns=""><Choose><When Condition="" SPAM=""/></Choose></Project>`, [
            msbuild.Issues.invalidAttribute("When", "SPAM", new qub.Span(45, 7))
        ]);
        parseTest(`<Project xmlns=""><Choose><When Condition="" Label=""/></Choose></Project>`, [
            msbuild.Issues.invalidAttribute("When", "Label", new qub.Span(45, 8))
        ]);

        // When children
        parseTest(`<Project xmlns=""><Choose><When Condition="">   <Choose/>   </When></Choose></Project>`, [
            msbuild.Issues.missingRequiredChildElement("Choose", "When", new qub.Span(49, 6))
        ]);
        parseTest(`<Project xmlns=""><Choose><When Condition="">   <PropertyGroup/>   </When></Choose></Project>`);
        parseTest(`<Project xmlns=""><Choose><When Condition="">   <ItemGroup/>   </When></Choose></Project>`);

        // Otherwise attributes
        parseTest(`<Project xmlns=""><Choose><When Condition=""/><Otherwise SPAM=""/></Choose></Project>`, [
            msbuild.Issues.invalidAttribute("Otherwise", "SPAM", new qub.Span(57, 7))
        ]);

        // Otherwise children
        parseTest(`<Project xmlns=""><Choose><When Condition=""/><Otherwise>     </Otherwise></Choose></Project>`);
        parseTest(`<Project xmlns=""><Choose><When Condition=""/><Otherwise>  hello  </Otherwise></Choose></Project>`, [
            msbuild.Issues.noTextSegmentsAllowed("Otherwise", new qub.Span(59, 5))
        ]);
        parseTest(`<Project xmlns=""><Choose><When Condition=""/><Otherwise>  <Choose/>  </Otherwise></Choose></Project>`, [
            msbuild.Issues.missingRequiredChildElement("Choose", "When", new qub.Span(60, 6))
        ]);
        parseTest(`<Project xmlns=""><Choose><When Condition=""/><Otherwise>  <PropertyGroup/>  </Otherwise></Choose></Project>`);
        parseTest(`<Project xmlns=""><Choose><When Condition=""/><Otherwise>  <ItemGroup/>  </Otherwise></Choose></Project>`);
        parseTest(`<Project xmlns=""><Choose><When Condition=""/><Otherwise>  <SPAM/>  </Otherwise></Choose></Project>`, [
            msbuild.Issues.invalidChildElement("Otherwise", "SPAM", new qub.Span(59, 7))
        ]);

        // PropertyGroup attributes

        // PropertyGroup children
    });
});