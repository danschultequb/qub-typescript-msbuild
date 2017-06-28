import * as qub from "qub";
import * as xml from "qub-xml";

export function getXMLTextSegments(segments: qub.Iterable<xml.Segment>): qub.Iterable<xml.Text> {
    return segments
        .where((segment: xml.Segment) => segment instanceof xml.Text && !segment.isWhitespace())
        .map((segment: xml.Segment) => segment as xml.Text);
}

export function getXMLElementsAndUnrecognizedTags(segments: qub.Iterable<xml.Segment>): qub.Iterable<xml.Element | xml.EmptyElement | xml.UnrecognizedTag> {
    return segments
        .where((segment: xml.Segment) => segment instanceof xml.Element || segment instanceof xml.EmptyElement || segment instanceof xml.UnrecognizedTag)
        .map((segment: xml.Segment) => segment as xml.Element | xml.EmptyElement | xml.UnrecognizedTag);
}

export function getXMLElements(segments: qub.Iterable<xml.Segment>): qub.Iterable<xml.Element | xml.EmptyElement> {
    return segments
        .where((segment: xml.Segment) => segment instanceof xml.Element || segment instanceof xml.EmptyElement)
        .map((segment: xml.Segment) => segment as xml.Element | xml.EmptyElement);
}

export function getXMLElementName(xmlElement: xml.Element | xml.EmptyElement | xml.UnrecognizedTag): xml.Name {
    return !xmlElement || xmlElement instanceof xml.UnrecognizedTag ? undefined : xmlElement.getName();
}

export function getXMLElementNameString(xmlElement: xml.Element | xml.EmptyElement | xml.UnrecognizedTag): string {
    const xmlElementName: xml.Name = getXMLElementName(xmlElement);
    return xmlElementName ? xmlElementName.toString() : undefined;
}

function matchesString(value: string, expectedValue: string): boolean {
    return qub.toLowerCase(value) === qub.toLowerCase(expectedValue);
}

function matchesName(name: xml.Name, expectedName: string): boolean {
    return matchesString(name.toString(), expectedName);
}

/**
 * The operator in a ComparisonExpression.
 */
export class Operator {
    constructor(private _lexes: qub.Iterable<xml.Lex>, private _precedence: number) {
    }

    public get startIndex(): number {
        return qub.getStartIndex(this._lexes);
    }

    public get afterEndIndex(): number {
        return qub.getAfterEndIndex(this._lexes);
    }

    public get length(): number {
        return qub.getContiguousLength(this._lexes);
    }

    public get span(): qub.Span {
        return qub.getSpan(this._lexes);
    }

    public get precedence(): number {
        return this._precedence;
    }

    public toString(): string {
        return qub.getCombinedText(this._lexes);
    }
}

export function createNegateOperator(lexes: qub.Iterable<xml.Lex>): Operator {
    return new Operator(lexes, OperatorPrecedence.PrefixNegate);
}

export function createEqualsOperator(lexes: qub.Iterable<xml.Lex>): Operator {
    return new Operator(lexes, OperatorPrecedence.InfixEquals);
}

export function createNotEqualsOperator(lexes: qub.Iterable<xml.Lex>): Operator {
    return new Operator(lexes, OperatorPrecedence.InfixNotEquals);
}

/**
 * A parsed expression from an attribute or property value.
 */
export abstract class Expression {
    public abstract get startIndex(): number;
    public abstract get afterEndIndex(): number;

    public abstract toString(): string;
}

export function isWhitespace(expression: Expression): boolean {
    return expression instanceof UnquotedStringExpression && expression.toString().trim() === "";
}

/**
 * An unquoted string literal expression.
 */
export class UnquotedStringExpression extends Expression {
    constructor(private _lexes: qub.Iterable<xml.Lex>) {
        super();
    }

    public get startIndex(): number {
        return qub.getStartIndex(this._lexes);
    }

    public get afterEndIndex(): number {
        return qub.getAfterEndIndex(this._lexes);
    }

    public toString(): string {
        return qub.getCombinedText(this._lexes);
    }
}

/**
 * A quoted expression.
 */
export class QuotedStringExpression extends Expression {
    constructor(private _startQuote: xml.Lex, private _innerExpression: Expression, private _endQuote: xml.Lex) {
        super();
    }

    public get startIndex(): number {
        return this._startQuote.startIndex;
    }

    public get afterEndIndex(): number {
        let result: number;
        if (this._endQuote) {
            result = this._endQuote.afterEndIndex;
        }
        else if (this._innerExpression) {
            result = this._innerExpression.afterEndIndex;
        }
        else {
            result = this._startQuote.afterEndIndex;
        }
        return result;
    }

    public toString(): string {
        let result: string = this._startQuote.toString();
        if (this._innerExpression) {
            result += this._innerExpression.toString();
        }
        if (this._endQuote) {
            result += this._endQuote.toString();
        }
        return result;
    }
}

/**
 * An expression that is replaced by the value of a property. If the property is not defined, then
 * it will be removed when the expression value is evaluated.
 */
export class PropertyExpression extends Expression {
    constructor(private _lexes: qub.Iterable<xml.Lex>) {
        super();
    }

    public get startIndex(): number {
        return this._lexes.first().startIndex;
    }

    public get afterEndIndex(): number {
        return this._lexes.last().afterEndIndex;
    }

    public toString(): string {
        return qub.getCombinedText(this._lexes);
    }
}

/**
 * An expression that is replaced by the value of an item. If the item is not defined, then it will
 * be replaced by an empty collection of items.
 */
export class ItemExpression extends Expression {
    constructor(private _lexes: qub.Iterable<xml.Lex>) {
        super();
    }

    public get startIndex(): number {
        return this._lexes.first().startIndex;
    }

    public get afterEndIndex(): number {
        return this._lexes.last().afterEndIndex;
    }

    public toString(): string {
        return qub.getCombinedText(this._lexes);
    }
}

/**
 * An expression that evaluates to the concatenation of the provided leftExpression and the provided
 * rightExpression.
 */
export class ConcatenateExpression extends Expression {
    constructor(private _leftExpression: Expression, private _rightExpression: Expression) {
        super();
    }

    public get startIndex(): number {
        return this._leftExpression.startIndex;
    }

    public get afterEndIndex(): number {
        return this._rightExpression.afterEndIndex;
    }

    public toString(): string {
        return this._leftExpression.toString() + this._rightExpression.toString();
    }
}

/**
 * An expression that applies the provided operator to the left and right expressions.
 */
export class BinaryExpression extends Expression {
    constructor(private _leftExpression: Expression, private _operator: Operator, private _rightExpression: Expression) {
        super();
    }

    public get startIndex(): number {
        return this._leftExpression ? this._leftExpression.startIndex : this._operator.startIndex;
    }

    public get afterEndIndex(): number {
        return this._rightExpression ? this._rightExpression.afterEndIndex : this._operator.afterEndIndex;
    }

    public toString(): string {
        let result: string = "";
        if (this._leftExpression) {
            result += this._leftExpression.toString();
        }
        result += this._operator;
        if (this._rightExpression) {
            result += this._rightExpression.toString();
        }
        return result;
    }
}

export class OperatorPrecedence {
    public static InfixEquals: number = 0;
    public static InfixNotEquals: number = 0;

    public static PrefixNegate: number = 1;
}

export interface ExpressionBuilder {
    getPrecedence(): number;

    build(expression: Expression, issues: qub.ArrayList<qub.Issue>): Expression;
}

export class BinaryExpressionBuilder implements ExpressionBuilder {
    constructor(private _leftExpression: Expression, private _operator: Operator) {
    }

    public getPrecedence(): number {
        return this._operator.precedence;
    }

    public build(rightExpression: Expression, issues: qub.ArrayList<qub.Issue>): Expression {
        if (!rightExpression || isWhitespace(rightExpression)) {
            addIssue(issues, Issues.missingRightExpression(this._operator.span));
        }

        return new BinaryExpression(this._leftExpression, this._operator, rightExpression);
    }
}

/**
 * An expression used for unary operators that occur before another expression, such as a negation
 * (!<sub-expression>).
 */
export class PrefixExpression extends Expression {
    constructor(private _operator: Operator, private _expression: Expression) {
        super();
    }

    public get startIndex(): number {
        return this._operator.startIndex;
    }

    public get afterEndIndex(): number {
        return this._expression ? this._expression.afterEndIndex : this._operator.afterEndIndex;
    }

    public toString(): string {
        let result: string = this._operator.toString();
        if (this._expression) {
            result += this._expression.toString();
        }
        return result;
    }
}

/**
 * An expression builder used for unary operators that occur before another expression, such as a
 * negation (!<sub-expression>).
 */
export class PrefixExpressionBuilder implements ExpressionBuilder {
    constructor(private _operator: Operator) {
    }

    public getPrecedence(): number {
        return 1;
    }

    public hasPrecedenceGreaterThanOrEqualTo(rhs: ExpressionBuilder): boolean {
        let result: boolean;

        if (!rhs) {
            result = true;
        }
        else if (rhs instanceof PrefixExpressionBuilder) {
            result = false
        }
        else {
            result = true;
        }

        return result;
    }

    public build(expression: Expression, issues: qub.ArrayList<qub.Issue>): Expression {
        if (!expression || isWhitespace(expression)) {
            addIssue(issues, Issues.missingExpression(this._operator.span));
        }

        return new PrefixExpression(this._operator, expression);
    }
}

export enum ElementType {
    Choose,
    Import,
    ImportGroup,
    Item,
    ItemDefinitionGroup,
    ItemGroup,
    ItemMetadata,
    OnError,
    Otherwise,
    Output,
    Parameter,
    ParameterGroup,
    Project,
    ProjectExtensions,
    Property,
    PropertyGroup,
    Target,
    TargetItemGroup,
    TargetItem,
    Task,
    TaskBody,
    UsingTask,
    When,
    Unrecognized
}

export class Attribute {
    private _expression: Expression;

    constructor(private _xmlAttribute: xml.Attribute) {
    }

    public get name(): xml.Name {
        return this._xmlAttribute.name;
    }

    public get value(): xml.QuotedString {
        return this._xmlAttribute.value;
    }

    public get expression(): Expression {
        const isCondition: boolean = matchesName(this.name, "condition");
        return this.value ? parseExpression(isCondition, this.value.unquotedLexes.iterate()) : undefined;
    }

    public containsIndex(index: number): boolean {
        return this._xmlAttribute.containsIndex(index);
    }
}

export abstract class Element {
    constructor(private _type: ElementType, private _xmlElement: xml.Element | xml.EmptyElement | xml.UnrecognizedTag) {
    }

    public get type(): ElementType {
        return this._type;
    }

    public get xmlElement(): xml.Element | xml.EmptyElement | xml.UnrecognizedTag {
        return this._xmlElement;
    }

    public get attributes(): qub.Iterable<Attribute> {
        return !this._xmlElement || this._xmlElement instanceof xml.UnrecognizedTag ? new qub.ArrayList<Attribute>() : this._xmlElement.attributes.map((xmlAttribute: xml.Attribute) => new Attribute(xmlAttribute));
    }

    public getAttribute(attributeName: string): Attribute {
        return this.attributes.first((attribute: Attribute) => matchesName(attribute.name, attributeName));
    }

    public containsAttribute(attributeName: string): boolean {
        return qub.isDefined(this.getAttribute(attributeName));
    }

    public containsIndex(index: number): boolean {
        return this.xmlElement && this.xmlElement.containsIndex(index) ? true : false;
    }

    /**
     * Get the name(s) of this element.
     */
    public get names(): qub.Iterable<xml.Name> {
        const result = new qub.ArrayList<xml.Name>();
        //if (this._xmlElement) {
        if (this._xmlElement instanceof xml.Element) {
            result.add(this._xmlElement.startTag.getName());
            if (this._xmlElement.endTag && this._xmlElement.endTag.name) {
                result.add(this._xmlElement.endTag.name);
            }
        }
        else if (this._xmlElement instanceof xml.EmptyElement) {
            result.add(this._xmlElement.getName());
        }
        //}
        return result;
    }

    public getContainingName(index: number): xml.Name {
        return this.names.first((name: xml.Name) => name.containsIndex(index));
    }

    public get span(): qub.Span {
        return this._xmlElement ? this._xmlElement.span : undefined;
    }

    public getChildElements(): qub.Iterable<Element> {
        let result: qub.Iterable<Element>;

        if (this._xmlElement instanceof xml.Element) {
            const elementSchema: ElementSchema = getElementSchema(this.type, this.names.first().toString());
            if (elementSchema) {
                result = getXMLElementsAndUnrecognizedTags(this._xmlElement.children)
                    .map((xmlChildElement: xml.Element | xml.EmptyElement | xml.UnrecognizedTag) => {
                        const childElementSchema: ChildElementSchema = elementSchema.getChildElementSchema(getXMLElementNameString(xmlChildElement));
                        return childElementSchema
                            ? childElementSchema.createFunction(xmlChildElement)
                            : new UnrecognizedElement(xmlChildElement);
                    });
            }
        }

        if (!result) {
            result = new qub.ArrayList<Element>();
        }

        return result;
    }
}

export class ChooseElement extends Element {
    constructor(xmlElement: xml.Element | xml.EmptyElement) {
        super(ElementType.Choose, xmlElement);
    }

    public get whens(): qub.Iterable<WhenElement> {
        return this.getChildElements()
            .where((childElement: Element) => childElement.type === ElementType.When)
            .map((childElement: Element) => childElement as WhenElement);
    }

    public get otherwise(): OtherwiseElement {
        return this.getChildElements()
            .first((childElement: Element) => childElement.type === ElementType.Otherwise) as OtherwiseElement;
    }
}

export class ImportElement extends Element {
    constructor(xmlElement: xml.Element | xml.EmptyElement) {
        super(ElementType.Import, xmlElement);
    }

    public get condition(): Attribute {
        return this.getAttribute("Condition");
    }

    public get project(): Attribute {
        return this.getAttribute("Project");
    }
}

export class ImportGroupElement extends Element {
    constructor(xmlElement: xml.Element | xml.EmptyElement) {
        super(ElementType.ImportGroup, xmlElement);
    }

    public get condition(): Attribute {
        return this.getAttribute("Condition");
    }

    public get imports(): qub.Iterable<ImportElement> {
        return this.getChildElements()
            .where((childElement: Element) => childElement.type === ElementType.Import)
            .map((childElement: Element) => childElement as ImportElement);
    }
}

export class ItemElement extends Element {
    constructor(xmlElement: xml.Element | xml.EmptyElement) {
        super(ElementType.Item, xmlElement);
    }
}

export class ItemDefinitionGroupElement extends Element {
    constructor(xmlElement: xml.Element | xml.EmptyElement) {
        super(ElementType.ItemDefinitionGroup, xmlElement);
    }

    public get condition(): Attribute {
        return this.getAttribute("Condition");
    }

    public get items(): qub.Iterable<ItemElement> {
        return this.getChildElements()
            .where((childElement: Element) => childElement.type === ElementType.Item)
            .map((childElement: Element) => childElement as ItemElement);
    }
}

export class ItemGroupElement extends Element {
    constructor(xmlElement: xml.Element | xml.EmptyElement) {
        super(ElementType.ItemGroup, xmlElement);
    }

    public get condition(): Attribute {
        return this.getAttribute("Condition");
    }

    public get label(): Attribute {
        return this.getAttribute("Label");
    }

    public get items(): qub.Iterable<ItemElement> {
        return this.getChildElements()
            .where((childElement: Element) => childElement.type === ElementType.Item)
            .map((childElement: Element) => childElement as ItemElement);
    }
}

export class ItemMetadataElement extends Element {
    constructor(xmlElement: xml.Element | xml.EmptyElement) {
        super(ElementType.ItemMetadata, xmlElement);
    }
}

export class OnErrorElement extends Element {
    constructor(xmlElement: xml.Element | xml.EmptyElement) {
        super(ElementType.OnError, xmlElement);
    }

    public get condition(): Attribute {
        return this.getAttribute("Condition");
    }

    public get executeTargets(): Attribute {
        return this.getAttribute("ExecuteTargets");
    }
}

export class OtherwiseElement extends Element {
    constructor(xmlElement: xml.Element | xml.EmptyElement) {
        super(ElementType.Otherwise, xmlElement);
    }
}

export class OutputElement extends Element {
    constructor(xmlElement: xml.Element | xml.EmptyElement) {
        super(ElementType.Output, xmlElement);
    }
}

export class ParameterElement extends Element {
    constructor(xmlElement: xml.Element | xml.EmptyElement) {
        super(ElementType.Parameter, xmlElement);
    }
}

export class ParameterGroupElement extends Element {
    constructor(xmlElement: xml.Element | xml.EmptyElement) {
        super(ElementType.ParameterGroup, xmlElement);
    }
}

export class ProjectElement extends Element {
    constructor(xmlElement: xml.Element | xml.EmptyElement) {
        super(ElementType.Project, xmlElement);
    }

    public get defaultTargets(): Attribute {
        return this.getAttribute("DefaultTargets");
    }

    public get initialTargets(): Attribute {
        return this.getAttribute("InitialTargets");
    }

    public get toolsVersion(): Attribute {
        return this.getAttribute("ToolsVersion");
    }

    public get treatAsLocalProperty(): Attribute {
        return this.getAttribute("TreatAsLocalProperty");
    }

    public get xmlns(): Attribute {
        return this.getAttribute("Xmlns");
    }
}

export class ProjectExtensionsElement extends Element {
    constructor(xmlElement: xml.Element | xml.EmptyElement) {
        super(ElementType.ProjectExtensions, xmlElement);
    }
}

export class PropertyElement extends Element {
    constructor(xmlElement: xml.Element | xml.EmptyElement) {
        super(ElementType.Property, xmlElement);
    }
}

export class PropertyGroupElement extends Element {
    constructor(xmlElement: xml.Element | xml.EmptyElement) {
        super(ElementType.PropertyGroup, xmlElement);
    }

    public get condition(): Attribute {
        return this.getAttribute("Condition");
    }
}

export class TargetElement extends Element {
    constructor(xmlElement: xml.Element | xml.EmptyElement) {
        super(ElementType.Target, xmlElement);
    }
}

export class TaskElement extends Element {
    constructor(xmlElement: xml.Element | xml.EmptyElement) {
        super(ElementType.Task, xmlElement);
    }
}

export class TaskBodyElement extends Element {
    constructor(xmlElement: xml.Element | xml.EmptyElement) {
        super(ElementType.TaskBody, xmlElement);
    }
}

export class UsingTaskElement extends Element {
    constructor(xmlElement: xml.Element | xml.EmptyElement) {
        super(ElementType.UsingTask, xmlElement);
    }
}

export class WhenElement extends Element {
    constructor(xmlElement: xml.Element | xml.EmptyElement) {
        super(ElementType.When, xmlElement);
    }

    public get condition(): Attribute {
        return this.getAttribute("condition");
    }
}

export class UnrecognizedElement extends Element {
    constructor(xmlElement: xml.Element | xml.EmptyElement | xml.UnrecognizedTag) {
        super(ElementType.Unrecognized, xmlElement);
    }
}

export class Issues {
    public static onlyOneProjectAllowed(span: qub.Span): qub.Issue {
        return qub.Error(`A MSBuild document can only have one "Project" element.`, span);
    }

    public static expectedProjectElement(span: qub.Span): qub.Issue {
        return qub.Error(`Expected the root element to be a "Project" element.`, span);
    }

    public static invalidAttribute(elementName: string, attributeName: string, span: qub.Span): qub.Issue {
        return qub.Error(`"${attributeName}" is not a valid attribute for a "${elementName}" element.`, span);
    }

    public static missingRequiredAttribute(attributeName: string, span: qub.Span): qub.Issue {
        return qub.Error(`Missing "${attributeName}" attribute.`, span);
    }

    public static attributeCantBeDefinedWith(attributeName: string, cantBeDefinedWithName: string, span: qub.Span): qub.Issue {
        return qub.Error(`"${attributeName}" can't be defined with "${cantBeDefinedWithName}".`, span);
    }

    public static invalidChildElement(parentElementName: string, childElementName: string, span: qub.Span): qub.Issue {
        return qub.Error(`"${childElementName}" is not a valid child element of a "${parentElementName}" element.`, span);
    }

    public static missingRequiredChildElement(parentElementName: string, requiredChildElementName: string, span: qub.Span): qub.Issue {
        return qub.Error(`A "${parentElementName}" element must have at least one "${requiredChildElementName}" child element.`, span);
    }

    public static invalidLastChildElement(parentElementName: string, mustBeLastChildElementName: string, span: qub.Span): qub.Issue {
        return qub.Error(`If it exists, a "${mustBeLastChildElementName}" element must be the last element in a "${parentElementName}" element.`, span);
    }

    public static atMostOneChildElement(parentElementName: string, atMostOneChildElementName: string, span: qub.Span): qub.Issue {
        return qub.Error(`A "${parentElementName}" element can have at most one "${atMostOneChildElementName}" child element.`, span);
    }

    public static noTextSegmentsAllowed(elementName: string, span: qub.Span): qub.Issue {
        return qub.Error(`A "${elementName}" element can't contain text segments.`, span);
    }

    public static invalidPropertyNameCharacter(propertyNameCharacter: string, span: qub.Span): qub.Issue {
        return qub.Error(`'${propertyNameCharacter}' is not a valid property name character.`, span);
    }

    public static invalidItemNameCharacter(itemNameCharacter: string, span: qub.Span): qub.Issue {
        return qub.Error(`'${itemNameCharacter}' is not a valid item name character.`, span);
    }

    public static missingPropertyName(span: qub.Span): qub.Issue {
        return qub.Error(`Missing property name.`, span);
    }

    public static expectedPropertyName(span: qub.Span): qub.Issue {
        return qub.Error(`Expected property name.`, span);
    }

    public static missingItemName(span: qub.Span): qub.Issue {
        return qub.Error(`Missing item name.`, span);
    }

    public static expectedItemName(span: qub.Span): qub.Issue {
        return qub.Error(`Expected item name.`, span);
    }

    public static missingRightParenthesis(span: qub.Span): qub.Issue {
        return qub.Error(`Missing closing right parenthesis (')').`, span);
    }

    public static missingEndQuote(quote: string, span: qub.Span): qub.Issue {
        return qub.Error(`Missing end quote (${quote}).`, span);
    }

    public static missingEqualsSign(span: qub.Span): qub.Issue {
        return qub.Error(`Missing equals sign ('=').`, span);
    }

    public static missingSecondEqualsSign(span: qub.Span): qub.Issue {
        return qub.Error(`Missing second equals sign ('=').`, span);
    }

    public static expectedSecondEqualsSign(span: qub.Span): qub.Issue {
        return qub.Error(`Expected second equals sign ('=').`, span);
    }

    public static expectedLeftExpression(span: qub.Span): qub.Issue {
        return qub.Error(`Expected left hand side of the expression.`, span);
    }

    public static missingExpression(span: qub.Span): qub.Issue {
        return qub.Error(`Missing expression.`, span);
    }

    public static missingRightExpression(span: qub.Span): qub.Issue {
        return qub.Error(`Missing right hand side of the expression.`, span);
    }
}

function addIssue(issues: qub.ArrayList<qub.Issue>, issue: qub.Issue): void {
    if (issues) {
        issues.add(issue);
    }
}

export class Document {
    private _elements: qub.Iterable<Element>;
    private _project: ProjectElement;

    constructor(private _xmlDocument: xml.Document, private _msbuildIssues: qub.ArrayList<qub.Issue> = new qub.ArrayList<qub.Issue>()) {
        const xmlRootElements: qub.Iterable<xml.Element | xml.EmptyElement> = getXMLElements(this._xmlDocument.segments);
        if (xmlRootElements.any()) {
            const firstXMLRootElement: xml.Element | xml.EmptyElement = xmlRootElements.first();
            if (!projectSchema.matchesName(firstXMLRootElement.getName())) {
                this._msbuildIssues.add(Issues.expectedProjectElement(firstXMLRootElement.span));
            }

            const xmlProjectElements: qub.Iterable<xml.Element | xml.EmptyElement> = xmlRootElements.where((xmlRootElement: xml.Element | xml.EmptyElement) => projectSchema.matchesName(xmlRootElement.getName()));
            for (const xmlProjectElement of xmlProjectElements) {
                validateProject(xmlProjectElement, this._msbuildIssues);
                if (!this._project) {
                    this._project = new ProjectElement(xmlProjectElement);
                }
            }
        }
    }

    public get xmlDocument(): xml.Document {
        return this._xmlDocument;
    }

    public get project(): ProjectElement {
        return this._project
    }

    public get elements(): qub.Iterable<Element> {
        return getXMLElementsAndUnrecognizedTags(this._xmlDocument.segments)
            .map((xmlElement: xml.Element | xml.EmptyElement | xml.UnrecognizedTag) =>
                xmlElement instanceof xml.UnrecognizedTag || !matchesName(xmlElement.getName(), projectSchema.name)
                    ? new UnrecognizedElement(xmlElement)
                    : new ProjectElement(xmlElement));
    }

    public get issues(): qub.Iterable<qub.Issue> {
        return this.xmlIssues.concatenate(this.msbuildIssues);
    }

    public get msbuildIssues(): qub.Iterable<qub.Issue> {
        return this._msbuildIssues;
    }

    public get xmlIssues(): qub.Iterable<qub.Issue> {
        return this._xmlDocument.issues;
    }
}

export function validateElement(type: ElementType, xmlElement: xml.Element | xml.EmptyElement, issues: qub.ArrayList<qub.Issue>): void {
    const elementSchema: ElementSchema = getElementSchema(type, getXMLElementNameString(xmlElement));
    for (const attribute of xmlElement.attributes) {
        const attributeSchema: AttributeSchema = elementSchema.getAttributeSchema(attribute.name.toString());
        if (!attributeSchema) {
            if (!elementSchema.allowAllAttributes) {
                addIssue(issues, Issues.invalidAttribute(elementSchema.name, attribute.name.toString(), attribute.span));
            }
        }
        else {
            if (attributeSchema.notWith && xmlElement.attributes.any((attribute: xml.Attribute) => matchesName(attribute.name, attributeSchema.notWith))) {
                addIssue(issues, Issues.attributeCantBeDefinedWith(attributeSchema.name, attributeSchema.notWith, attribute.name.span));
            }

            if (attribute.value) {
                if (matchesName(attribute.name, "condition")) {
                    parseCondition(attribute.value.unquotedLexes.iterate(), issues);
                }
                else {
                    parseExpression(false, attribute.value.unquotedLexes.iterate(), issues);
                }
            }
        }
    }

    for (const requiredAttribute of elementSchema.requiredAttributes) {
        if (!xmlElement.attributes.any((attribute: xml.Attribute) => matchesName(attribute.name, requiredAttribute.name))) {
            if (requiredAttribute.notWith) {
                if (!xmlElement.attributes.any((attribute: xml.Attribute) => matchesName(attribute.name, requiredAttribute.notWith))) {
                    addIssue(issues, Issues.missingRequiredAttribute(requiredAttribute.name, xmlElement.getName().span));
                }
            }
            else if (requiredAttribute.requiredIfNotDefined) {
                if (!xmlElement.attributes.any((attribute: xml.Attribute) => matchesName(attribute.name, requiredAttribute.requiredIfNotDefined))) {
                    addIssue(issues, Issues.missingRequiredAttribute(requiredAttribute.name, xmlElement.getName().span));
                }
            }
            else {
                addIssue(issues, Issues.missingRequiredAttribute(requiredAttribute.name, xmlElement.getName().span));
            }
        }
    }

    if (!elementSchema.dontValidateChildElements) {
        if (xmlElement instanceof xml.EmptyElement) {
            for (const requiredChildElementSchema of elementSchema.requiredChildElements) {
                addIssue(issues, Issues.missingRequiredChildElement(elementSchema.name, requiredChildElementSchema.name, xmlElement.getName().span));
            }
        }
        else {
            const textChildElements: qub.Iterable<xml.Text> = getXMLTextSegments(xmlElement.children);
            if (!elementSchema.allowTextChildElements) {
                for (const xmlTextSegment of textChildElements) {
                    addIssue(issues, Issues.noTextSegmentsAllowed(elementSchema.name, xmlTextSegment.nonWhitespaceSpan));
                }
            }
            else {
                for (const textChildElement of textChildElements) {
                    const textLexes: qub.Iterable<xml.Lex> = textChildElement.segments
                        .where((segment: xml.Segment) => segment instanceof xml.Lex)
                        .map((segment: xml.Segment) => <xml.Lex>segment);
                    parseExpression(false, textLexes.iterate(), issues);
                }
            }

            const allowedChildElements: qub.Iterable<ChildElementSchema> = elementSchema.childElements;
            const additionalChildElements: ChildElementSchema = elementSchema.additionalChildElements;
            const xmlChildElements: qub.Iterable<xml.Element | xml.EmptyElement> = getXMLElements(xmlElement.children);
            if (!allowedChildElements.any()) {
                if (!additionalChildElements) {
                    for (const xmlChildElement of xmlChildElements) {
                        addIssue(issues, Issues.invalidChildElement(elementSchema.name, xmlChildElement.getName().toString(), xmlChildElement.span));
                    }
                }
                else {
                    for (const xmlChildElement of xmlChildElements) {
                        additionalChildElements.validateFunction(xmlChildElement, issues);
                    }
                }
            }
            else {
                for (const xmlChildElement of xmlChildElements) {
                    const childElementSchema: ChildElementSchema = allowedChildElements.first((allowedChildElementSchema: ChildElementSchema) => allowedChildElementSchema.matchesName(xmlChildElement.getName()));
                    if (!childElementSchema) {
                        if (!additionalChildElements) {
                            addIssue(issues, Issues.invalidChildElement(elementSchema.name, xmlChildElement.getName().toString(), xmlChildElement.span));
                        }
                        else {
                            additionalChildElements.validateFunction(xmlChildElement, issues);
                        }
                    }
                    else {
                        childElementSchema.validateFunction(xmlChildElement, issues);
                    }
                }

                for (const requiredChildElementSchema of elementSchema.requiredChildElements) {
                    if (!xmlChildElements.any((xmlChildElement: xml.Element | xml.EmptyElement) => requiredChildElementSchema.matchesName(xmlChildElement.getName()))) {
                        addIssue(issues, Issues.missingRequiredChildElement(elementSchema.name, requiredChildElementSchema.name, xmlElement.getName().span));
                    }
                }

                const mustBeLastChildElementSchema: ChildElementSchema = elementSchema.mustBeLastChildElement;
                if (mustBeLastChildElementSchema) {
                    const mustBeLastXmlChildElement: xml.Element | xml.EmptyElement = xmlChildElements.first((xmlChildElement: xml.Element | xml.EmptyElement) => mustBeLastChildElementSchema.matchesName(xmlChildElement.getName()));
                    if (mustBeLastXmlChildElement && mustBeLastXmlChildElement !== xmlChildElements.last()) {
                        addIssue(issues, Issues.invalidLastChildElement(elementSchema.name, mustBeLastChildElementSchema.name, mustBeLastXmlChildElement.span));
                    }
                }

                for (const atMostOneChildElementSchema of elementSchema.atMostOneChildElements) {
                    const matchingChildElements: qub.Iterable<xml.Element | xml.EmptyElement> = xmlChildElements
                        .where((xmlChildElement: xml.Element | xml.EmptyElement) => atMostOneChildElementSchema.matchesName(xmlChildElement.getName()))
                        .skip(1);

                    for (const xmlChildElement of matchingChildElements) {
                        addIssue(issues, Issues.atMostOneChildElement(elementSchema.name, atMostOneChildElementSchema.name, xmlChildElement.span));
                    }
                }
            }
        }
    }
}

export function validateChoose(xmlElement: xml.Element | xml.EmptyElement, issues: qub.ArrayList<qub.Issue>): void {
    validateElement(ElementType.Choose, xmlElement, issues);
}

export function validateImport(xmlElement: xml.Element | xml.EmptyElement, issues: qub.ArrayList<qub.Issue>): void {
    validateElement(ElementType.Import, xmlElement, issues);
}

export function validateImportGroup(xmlElement: xml.Element | xml.EmptyElement, issues: qub.ArrayList<qub.Issue>): void {
    validateElement(ElementType.ImportGroup, xmlElement, issues);
}

export function validateItem(xmlElement: xml.Element | xml.EmptyElement, issues: qub.ArrayList<qub.Issue>): void {
    validateElement(ElementType.Item, xmlElement, issues);
}

export function validateItemDefinitionGroup(xmlElement: xml.Element | xml.EmptyElement, issues: qub.ArrayList<qub.Issue>): void {
    validateElement(ElementType.ItemDefinitionGroup, xmlElement, issues);
}

export function validateItemGroup(xmlElement: xml.Element | xml.EmptyElement, issues: qub.ArrayList<qub.Issue>): void {
    validateElement(ElementType.ItemGroup, xmlElement, issues);
}

export function validateItemMetadata(xmlElement: xml.Element | xml.EmptyElement, issues: qub.ArrayList<qub.Issue>): void {
    validateElement(ElementType.ItemMetadata, xmlElement, issues);
}

export function validateOnError(xmlElement: xml.Element | xml.EmptyElement, issues: qub.ArrayList<qub.Issue>): void {
    validateElement(ElementType.OnError, xmlElement, issues);
}

export function validateOtherwise(xmlElement: xml.Element | xml.EmptyElement, issues: qub.ArrayList<qub.Issue>): void {
    validateElement(ElementType.Otherwise, xmlElement, issues);
}

export function validateOutput(xmlElement: xml.Element | xml.EmptyElement, issues: qub.ArrayList<qub.Issue>): void {
    validateElement(ElementType.Output, xmlElement, issues);
}

export function validateParameter(xmlElement: xml.Element | xml.EmptyElement, issues: qub.ArrayList<qub.Issue>): void {
    validateElement(ElementType.Parameter, xmlElement, issues);
}

export function validateParameterGroup(xmlElement: xml.Element | xml.EmptyElement, issues: qub.ArrayList<qub.Issue>): void {
    validateElement(ElementType.ParameterGroup, xmlElement, issues);
}

export function validateProject(xmlElement: xml.Element | xml.EmptyElement, issues: qub.ArrayList<qub.Issue>): void {
    validateElement(ElementType.Project, xmlElement, issues);
}

export function validateProjectExtensions(xmlElement: xml.Element | xml.EmptyElement, issues: qub.ArrayList<qub.Issue>): void {
    validateElement(ElementType.ProjectExtensions, xmlElement, issues);
}

export function validateProperty(xmlElement: xml.Element | xml.EmptyElement, issues: qub.ArrayList<qub.Issue>): void {
    validateElement(ElementType.Property, xmlElement, issues);
}

export function validatePropertyGroup(xmlElement: xml.Element | xml.EmptyElement, issues: qub.ArrayList<qub.Issue>): void {
    validateElement(ElementType.PropertyGroup, xmlElement, issues);
}

export function validateTarget(xmlElement: xml.Element | xml.EmptyElement, issues: qub.ArrayList<qub.Issue>): void {
    validateElement(ElementType.Target, xmlElement, issues);
}

export function validateTargetItem(xmlElement: xml.Element | xml.EmptyElement, issues: qub.ArrayList<qub.Issue>): void {
    validateElement(ElementType.TargetItem, xmlElement, issues);
}

export function validateTargetItemGroup(xmlElement: xml.Element | xml.EmptyElement, issues: qub.ArrayList<qub.Issue>): void {
    validateElement(ElementType.TargetItemGroup, xmlElement, issues);
}

export function validateTask(xmlElement: xml.Element | xml.EmptyElement, issues: qub.ArrayList<qub.Issue>): void {
    validateElement(ElementType.Task, xmlElement, issues);
}

export function validateTaskBody(xmlElement: xml.Element | xml.EmptyElement, issues: qub.ArrayList<qub.Issue>): void {
    validateElement(ElementType.TaskBody, xmlElement, issues);
}

export function validateUsingTask(xmlElement: xml.Element | xml.EmptyElement, issues: qub.ArrayList<qub.Issue>): void {
    validateElement(ElementType.UsingTask, xmlElement, issues);
}

export function validateWhen(xmlElement: xml.Element | xml.EmptyElement, issues: qub.ArrayList<qub.Issue>): void {
    validateElement(ElementType.When, xmlElement, issues);
}

/**
 * Parse the condition expression that consists of the provided lexes. This condition expression is
 * the value of a condition attribute on a MSBuild start tag.
 * @param lexes The lexes that make up the condition expression.
 * @param issues The ArrayList where issues with the condition expression will be recorded.
 * @returns The condition expression that was parsed from the provided lexes.
 */
export function parseCondition(lexes: qub.Iterator<xml.Lex>, issues: qub.ArrayList<qub.Issue>): Expression {
    if (!lexes.hasStarted()) {
        lexes.next();
    }

    const expressionStack = new qub.Stack<Expression | ExpressionBuilder>();
    let operatorLexes: qub.ArrayList<xml.Lex>;
    while (lexes.hasCurrent()) {
        switch (lexes.getCurrent().toString()) {
            case "=":
                const firstEqualsSign: xml.Lex = lexes.takeCurrent();
                operatorLexes = new qub.ArrayList<xml.Lex>([firstEqualsSign]);

                if (!lexes.hasCurrent()) {
                    addIssue(issues, Issues.missingSecondEqualsSign(firstEqualsSign.span));
                }
                else if (lexes.getCurrent().toString() !== "=") {
                    addIssue(issues, Issues.expectedSecondEqualsSign(lexes.getCurrent().span));
                }
                else {
                    operatorLexes.add(lexes.takeCurrent());
                }

                const operator = new Operator(operatorLexes, OperatorPrecedence.InfixEquals);

                let left: Expression | ExpressionBuilder = expressionStack.pop();
                let leftExpression: Expression;
                while (!leftExpression) {
                    if (!left) {
                        addIssue(issues, Issues.expectedLeftExpression(operator.span));
                        break;
                    }
                    else if (left instanceof Expression) {
                        const top: Expression | ExpressionBuilder = expressionStack.peek();
                        if (top && !(top instanceof Expression) && top.getPrecedence() >= operator.precedence) {
                            // Remove top from the stack.
                            expressionStack.pop();

                            left = top.build(left, issues);
                        }
                        else {
                            leftExpression = left;
                            if (isWhitespace(leftExpression)) {
                                addIssue(issues, Issues.expectedLeftExpression(operator.span));
                            }
                        }
                    }
                    else {
                        leftExpression = left.build(undefined, issues);
                    }
                }

                const builder = new BinaryExpressionBuilder(leftExpression, operator);

                expressionStack.push(builder);
                break;

            case "!":
                const exclamationPoint: xml.Lex = lexes.takeCurrent();
                operatorLexes = new qub.ArrayList<xml.Lex>([exclamationPoint]);

                if (!lexes.hasCurrent() || lexes.getCurrent().toString() !== "=") {
                    const operator = createNegateOperator(operatorLexes);
                    const builder = new PrefixExpressionBuilder(operator);
                    expressionStack.push(builder);
                }
                else {
                    operatorLexes.add(lexes.takeCurrent());

                    const operator: Operator = createNotEqualsOperator(operatorLexes);

                    let left: Expression | ExpressionBuilder = expressionStack.pop();
                    let leftExpression: Expression;
                    while (!leftExpression) {
                        if (!left) {
                            addIssue(issues, Issues.expectedLeftExpression(operator.span));
                            break;
                        }
                        else if (left instanceof Expression) {
                            const top: Expression | ExpressionBuilder = expressionStack.peek();
                            if (top && !(top instanceof Expression) && top.getPrecedence() >= operator.precedence) {
                                // Remove top from expression stack.
                                expressionStack.pop();
                                left = top.build(left, issues);
                            }
                            else {
                                leftExpression = left;
                                if (isWhitespace(leftExpression)) {
                                    addIssue(issues, Issues.expectedLeftExpression(operator.span));
                                }
                            }
                        }
                        else {
                            leftExpression = left.build(undefined, issues);
                        }
                    }

                    const builder = new BinaryExpressionBuilder(leftExpression, operator);
                    expressionStack.push(builder);
                }
                break;

            default:
                const expression: Expression = parseExpression(true, lexes, issues);
                expressionStack.push(expression);
                break;
        }
    }

    let result: Expression;
    while (expressionStack.any()) {
        const top: Expression | ExpressionBuilder = expressionStack.pop();
        if (top instanceof Expression) {
            result = concatenateExpression(top, result);
        }
        else {
            result = top.build(result, issues);
        }
    }

    return result;
}

function createOperatorExpression(currentExpression: Expression, expressionStack: qub.Stack<Expression>, operatorStack: qub.Stack<Operator>, issues: qub.ArrayList<qub.Issue>): void {
    const operator: Operator = operatorStack.pop();
    switch (operator.toString()) {
        case "==":
            let rhs: Expression;
            let lhs: Expression;
            if (currentExpression) {
                rhs = currentExpression;
                lhs = expressionStack.pop();

                if (isWhitespace(rhs)) {
                    addIssue(issues, Issues.missingRightExpression(new qub.Span(rhs.startIndex - operator.toString().length, operator.toString().length)));
                }
            }
            else {
                rhs = expressionStack.pop();
                lhs = expressionStack.pop();
                if (rhs) {
                    if (!lhs) {
                        // If there was only one expression on the expression stack, that should be the lhs
                        // expression.
                        lhs = rhs;
                        rhs = undefined;
                        addIssue(issues, Issues.missingRightExpression(new qub.Span(lhs.afterEndIndex, operator.toString().length)));
                    }
                    else if (isWhitespace(rhs)) {
                        addIssue(issues, Issues.missingRightExpression(new qub.Span(lhs.afterEndIndex, operator.toString().length)));
                    }
                }
                else {
                    addIssue(issues, Issues.missingRightExpression(new qub.Span(0, operator.toString().length)));
                }
            }

            const comparisonExpression = new BinaryExpression(lhs, operator, rhs);
            expressionStack.push(comparisonExpression);
            break;
    }
}

/**
 * Parse the expression that consists of the provided lexes. This expression may be an attribute
 * value with the start and end quotes removed, a property value, or an item metadata value.
 * @param lexes The lexes that make up the expression.
 * @param issues The ArrayList where issues with the expression will be recorded.
 * @returns The expression that was parsed from the provided lexes.
 */
export function parseExpression(isCondition: boolean, lexes: qub.Iterator<xml.Lex>, issues?: qub.ArrayList<qub.Issue>, expectedEndQuote?: xml.Lex): Expression {
    if (!lexes.hasStarted()) {
        lexes.next();
    }

    let expression: Expression;
    while (lexes.hasCurrent()) {
        let currentExpression: Expression;
        const expressionLexes = new qub.ArrayList<xml.Lex>();

        switch (lexes.getCurrent().toString()) {
            case "$":
                expressionLexes.add(lexes.takeCurrent());
                if (lexes.hasCurrent() && lexes.getCurrent().toString() === "(") {
                    const leftParenthesis: xml.Lex = lexes.takeCurrent();
                    expressionLexes.add(leftParenthesis);

                    while (lexes.hasCurrent() && lexes.getCurrent().toString() !== ")") {
                        const lex = lexes.takeCurrent();
                        expressionLexes.add(lex);
                        switch (lex.getType()) {
                            case xml.LexType.Letters:
                            case xml.LexType.Digits:
                            case xml.LexType.Period:
                            case xml.LexType.Dash:
                            case xml.LexType.Underscore:
                            case xml.LexType.Colon:
                                break;

                            default:
                                addIssue(issues, Issues.invalidPropertyNameCharacter(lex.toString(), lex.span));
                                break;
                        }
                    }

                    if (!lexes.hasCurrent()) {
                        if (expressionLexes.last() === leftParenthesis) {
                            addIssue(issues, Issues.missingPropertyName(leftParenthesis.span));
                        }
                        addIssue(issues, Issues.missingRightParenthesis(leftParenthesis.span));

                        currentExpression = new UnquotedStringExpression(expressionLexes);
                    }
                    else {
                        const rightParenthesis: xml.Lex = lexes.takeCurrent();

                        if (expressionLexes.last() == leftParenthesis) {
                            addIssue(issues, Issues.expectedPropertyName(rightParenthesis.span));
                        }

                        expressionLexes.add(rightParenthesis);

                        currentExpression = new PropertyExpression(expressionLexes);
                    }
                }
                else {
                    currentExpression = parseUnquotedStringExpression(isCondition, lexes, expressionLexes, issues);
                }
                break;

            case "@":
                expressionLexes.add(lexes.takeCurrent());
                if (lexes.hasCurrent() && lexes.getCurrent().toString() === "(") {
                    const leftParenthesis: xml.Lex = lexes.takeCurrent();
                    expressionLexes.add(leftParenthesis);

                    while (lexes.hasCurrent() && lexes.getCurrent().toString() !== ")") {
                        const lex = lexes.takeCurrent();
                        expressionLexes.add(lex);
                        switch (lex.getType()) {
                            case xml.LexType.Letters:
                            case xml.LexType.Digits:
                            case xml.LexType.Period:
                            case xml.LexType.Dash:
                            case xml.LexType.Underscore:
                            case xml.LexType.Colon:
                                break;

                            default:
                                addIssue(issues, Issues.invalidItemNameCharacter(lex.toString(), lex.span));
                                break;
                        }
                    }

                    if (!lexes.hasCurrent()) {
                        if (expressionLexes.last() === leftParenthesis) {
                            addIssue(issues, Issues.missingItemName(leftParenthesis.span));
                        }
                        addIssue(issues, Issues.missingRightParenthesis(leftParenthesis.span));
                    }
                    else {
                        const rightParenthesis: xml.Lex = lexes.takeCurrent();

                        if (expressionLexes.last() === leftParenthesis) {
                            addIssue(issues, Issues.expectedItemName(rightParenthesis.span));
                        }

                        expressionLexes.add(rightParenthesis);
                    }

                    currentExpression = new ItemExpression(expressionLexes);
                }
                else {
                    currentExpression = parseUnquotedStringExpression(isCondition, lexes, expressionLexes, issues);
                }
                break;

            case "'":
            case "\"":
                if (isCondition) {
                    const quote: xml.Lex = lexes.getCurrent();
                    if (!expectedEndQuote || expectedEndQuote.getType() !== quote.getType()) {
                        expressionLexes.add(quote);
                        lexes.next();

                        let innerExpression: Expression;
                        while (lexes.hasCurrent() && lexes.getCurrent().toString() !== quote.toString()) {
                            const currentExpression: Expression = parseExpression(true, lexes, issues, quote);
                            innerExpression = concatenateExpression(innerExpression, currentExpression);
                        }

                        let endQuote: xml.Lex;
                        if (!lexes.hasCurrent()) {
                            addIssue(issues, Issues.missingEndQuote(quote.toString(), quote.span));
                        }
                        else {
                            endQuote = lexes.takeCurrent();
                        }

                        currentExpression = new QuotedStringExpression(quote, innerExpression, endQuote);
                    }
                }
                else {
                    currentExpression = parseUnquotedStringExpression(isCondition, lexes, expressionLexes, issues);
                }
                break;

            case "=":
                if (!isCondition) {
                    currentExpression = parseUnquotedStringExpression(isCondition, lexes, expressionLexes, issues);
                }
                break;

            case "!":
                if (!isCondition) {
                    currentExpression = parseUnquotedStringExpression(isCondition, lexes, expressionLexes, issues);
                }
                else if (expectedEndQuote) {
                    const exclamationPoint: xml.Lex = lexes.takeCurrent();
                    let negatedExpression: Expression;

                    if (!lexes.hasCurrent() || (expectedEndQuote && lexes.getCurrent().toString() === expectedEndQuote.toString())) {
                        addIssue(issues, Issues.missingExpression(exclamationPoint.span));
                    }
                    else {
                        negatedExpression = parseExpression(isCondition, lexes, issues, expectedEndQuote);
                    }

                    const operator = createNegateOperator(new qub.ArrayList<xml.Lex>([exclamationPoint]));
                    currentExpression = new PrefixExpression(operator, negatedExpression);
                }
                break;

            default:
                currentExpression = parseUnquotedStringExpression(isCondition, lexes, expressionLexes, issues);
                break;
        }

        if (currentExpression) {
            expression = concatenateExpression(expression, currentExpression);
        }
        else {
            break;
        }
    }

    return expression;
}

function concatenateExpression(expression: Expression, toAdd: Expression): Expression {
    return expression ? (toAdd ? new ConcatenateExpression(expression, toAdd) : expression) : toAdd;
}

export function parseUnquotedStringExpression(isCondition: boolean, lexes: qub.Iterator<xml.Lex>, expressionLexes: qub.ArrayList<xml.Lex>, issues: qub.ArrayList<qub.Issue>): UnquotedStringExpression {
    if (lexes.hasCurrent()) {
        expressionLexes.add(lexes.getCurrent());

        while (lexes.next()) {
            const lexString: string = lexes.getCurrent().toString();
            if (lexString === "$" || lexString === "@" ||
                (isCondition && (lexString === "'" || lexString === "\"" || lexString === "=" || lexString === "!"))) {
                break;
            }
            else {
                expressionLexes.add(lexes.getCurrent());
            }
        }
    }

    return new UnquotedStringExpression(expressionLexes);
}

export function parse(text: string): Document {
    return new Document(xml.parse(text));
}

function createChoose(xmlElement: xml.Element | xml.EmptyElement): ChooseElement {
    return new ChooseElement(xmlElement);
}

function createImport(xmlElement: xml.Element | xml.EmptyElement): ImportElement {
    return new ImportElement(xmlElement);
}

function createImportGroup(xmlElement: xml.Element | xml.EmptyElement): ImportGroupElement {
    return new ImportGroupElement(xmlElement);
}

function createItem(xmlElement: xml.Element | xml.EmptyElement): ItemElement {
    return new ItemElement(xmlElement);
}

function createItemDefinitionGroup(xmlElement: xml.Element | xml.EmptyElement): ItemDefinitionGroupElement {
    return new ItemDefinitionGroupElement(xmlElement);
}

function createItemGroup(xmlElement: xml.Element | xml.EmptyElement): ItemGroupElement {
    return new ItemGroupElement(xmlElement);
}

function createItemMetadata(xmlElement: xml.Element | xml.EmptyElement): ItemMetadataElement {
    return new ItemMetadataElement(xmlElement);
}

function createOnError(xmlElement: xml.Element | xml.EmptyElement): OnErrorElement {
    return new OnErrorElement(xmlElement);
}

function createOtherwise(xmlElement: xml.Element | xml.EmptyElement): OtherwiseElement {
    return new OtherwiseElement(xmlElement);
}

function createOutput(xmlElement: xml.Element | xml.EmptyElement): OutputElement {
    return new OutputElement(xmlElement);
}

function createParameter(xmlElement: xml.Element | xml.EmptyElement): ParameterElement {
    return new ParameterElement(xmlElement);
}

function createParameterGroup(xmlElement: xml.Element | xml.EmptyElement): ParameterGroupElement {
    return new ParameterGroupElement(xmlElement);
}

function createProject(xmlElement: xml.Element | xml.EmptyElement): ProjectElement {
    return new ProjectElement(xmlElement);
}

function createProjectExtensions(xmlElement: xml.Element | xml.EmptyElement): ProjectExtensionsElement {
    return new ProjectExtensionsElement(xmlElement);
}

function createProperty(xmlElement: xml.Element | xml.EmptyElement): PropertyElement {
    return new PropertyElement(xmlElement);
}

function createPropertyGroup(xmlElement: xml.Element | xml.EmptyElement): PropertyGroupElement {
    return new PropertyGroupElement(xmlElement);
}

function createTarget(xmlElement: xml.Element | xml.EmptyElement): TargetElement {
    return new TargetElement(xmlElement);
}

function createTask(xmlElement: xml.Element | xml.EmptyElement): TaskElement {
    return new TaskElement(xmlElement);
}

function createTaskBody(xmlElement: xml.Element | xml.EmptyElement): TaskBodyElement {
    return new TaskBodyElement(xmlElement);
}

function createUsingTask(xmlElement: xml.Element | xml.EmptyElement): UsingTaskElement {
    return new UsingTaskElement(xmlElement);
}

function createWhen(xmlElement: xml.Element | xml.EmptyElement): WhenElement {
    return new WhenElement(xmlElement);
}

const msBuildFilePatterns: RegExp[] = [
    new RegExp("\\.props$"),
    new RegExp("\\.targets$"),
    new RegExp("\\..*proj$")
];

export interface AttributeSchemaContents {
    name: string;
    description: string;
    /**
     * Whether or not this attribute is required.
     */
    required?: boolean;

    /**
     * This attribute is required if the provided attribute is not defined.
     */
    requiredIfNotDefined?: string;

    /**
     * The name of an attribute that this attribute cannot be defined with.
     */
    notWith?: string;
}

export class AttributeSchema {
    constructor(private _contents: AttributeSchemaContents) {
    }

    public get name(): string {
        return this._contents.name;
    }

    public get description(): string {
        return this._contents.description;
    }

    public get required(): boolean {
        return this._contents.required ? true : false;
    }

    public get requiredIfNotDefined(): string {
        return this._contents.requiredIfNotDefined;
    }

    public get notWith(): string {
        return this._contents.notWith;
    }
}

export interface ChildElementSchemaContents {
    type: ElementType,
    required?: boolean;
    atMostOne?: boolean;
    mustBeLast?: boolean;
}

export class ChildElementSchema {
    constructor(private _contents: ChildElementSchemaContents) {
    }

    public get name(): string {
        return getElementSchema(this.type).name;
    }

    public get description(): string {
        return getElementSchema(this.type).description;
    }

    public matchesName(name: xml.Name): boolean {
        return matchesName(name, this.name);
    }

    public get validateFunction(): (xmlElement: xml.Element | xml.EmptyElement, issues: qub.ArrayList<qub.Issue>) => void {
        return getElementSchema(this.type).validateFunction;
    }

    public get createFunction(): (xmlElement: xml.Element | xml.EmptyElement | xml.UnrecognizedTag) => Element {
        return getElementSchema(this.type).createFunction;
    }

    public get type(): ElementType {
        return this._contents.type;
    }

    public get required(): boolean {
        return this._contents.required ? true : false;
    }

    public get atMostOne(): boolean {
        return this._contents.atMostOne ? true : false;
    }

    public get mustBeLast(): boolean {
        return this._contents.mustBeLast ? true : false;
    }
}

export interface ElementSchemaContents {
    name: string;
    description: string;
    msdn: string;
    validateFunction: (xmlElement: xml.Element | xml.EmptyElement, issues: qub.ArrayList<qub.Issue>) => void;
    createFunction: (xmlElement: xml.Element | xml.EmptyElement | xml.UnrecognizedTag) => Element;
    attributes?: AttributeSchema[];
    allowAllAttributes?: boolean;
    // If provided, all child elements not specified in childElements must adhere to this schema.
    additionalChildElements?: ChildElementSchema;
    // Child elements that are allowed for this element based on the child element's name.
    childElements?: ChildElementSchema[];
    dontValidateChildElements?: boolean;
    allowTextChildElements?: boolean;
}

export class ElementSchema {
    constructor(private _contents: ElementSchemaContents) {
    }

    public get name(): string {
        return this._contents.name;
    }

    public get description(): string {
        return this._contents.description;
    }

    public get msdn(): string {
        return this._contents.msdn;
    }

    public matchesName(name: xml.Name): boolean {
        return matchesName(name, this.name);
    }

    public get validateFunction(): (xmlElement: xml.Element | xml.EmptyElement, issues: qub.ArrayList<qub.Issue>) => void {
        return this._contents.validateFunction;
    }

    public get createFunction(): (xmlElement: xml.Element | xml.EmptyElement | xml.UnrecognizedTag) => Element {
        return this._contents.createFunction;
    }

    public get attributes(): qub.Iterable<AttributeSchema> {
        return new qub.ArrayList<AttributeSchema>(this._contents.attributes);
    }

    public get attributeNames(): qub.Iterable<string> {
        return this.attributes.map((allowedAttribute: AttributeSchema) => allowedAttribute.name);
    }

    public get requiredAttributes(): qub.Iterable<AttributeSchema> {
        return this.attributes.where((allowedAttribute: AttributeSchema) => allowedAttribute.required || allowedAttribute.requiredIfNotDefined ? true : false);
    }

    public getAttributeSchema(attributeName: string): AttributeSchema {
        return this.attributes.first((allowedAttribute: AttributeSchema) => matchesString(allowedAttribute.name, attributeName));
    }

    public get allowAllAttributes(): boolean {
        return this._contents.allowAllAttributes ? true : false;
    }

    public get additionalChildElements(): ChildElementSchema {
        return this._contents.additionalChildElements;
    }

    public get childElements(): qub.Iterable<ChildElementSchema> {
        return new qub.ArrayList<ChildElementSchema>(this._contents.childElements);
    }

    public get childElementNames(): qub.Iterable<string> {
        return this.childElements
            .map((allowedChildElementSchema: ChildElementSchema) => allowedChildElementSchema.name);
    }

    public get requiredChildElements(): qub.Iterable<ChildElementSchema> {
        return this.childElements.where((allowedChildElement: ChildElementSchema) => allowedChildElement.required);
    }

    public get requiredChildElementNames(): qub.Iterable<string> {
        return this.requiredChildElements.map((requiredChildElementSchema: ChildElementSchema) => requiredChildElementSchema.name);
    }

    public get mustBeLastChildElement(): ChildElementSchema {
        return this.childElements.first((allowedChildElement: ChildElementSchema) => allowedChildElement.mustBeLast);
    }

    public get atMostOneChildElements(): qub.Iterable<ChildElementSchema> {
        return this.childElements.where((allowedChildElement: ChildElementSchema) => allowedChildElement.atMostOne);
    }

    public getChildElementSchema(childElementName: string): ChildElementSchema {
        let result: ChildElementSchema = this.childElements.first((allowedChildElement: ChildElementSchema) => matchesString(childElementName, allowedChildElement.name));
        if (!result && this.additionalChildElements) {
            result = this.additionalChildElements
        }
        return result;
    }

    public get dontValidateChildElements(): boolean {
        return this._contents.dontValidateChildElements ? true : false;
    }

    public get allowTextChildElements(): boolean {
        return this._contents.allowTextChildElements ? true : false;
    }
}

const conditionDescription: string = "A condition to be evaluated. For more information, see [MSBuild Conditions](https://msdn.microsoft.com/en-us/library/7szfhaft.aspx).";
const labelDescription: string = "An identifier that can identify or order system and user elements.";

const chooseElementSchema = new ElementSchema({
    name: "Choose",
    description: "Evaluates child elements to select one set of ItemGroup elements and/or PropertyGroup elements to evaluate.",
    msdn: "https://msdn.microsoft.com/en-us/library/ms164282.aspx",
    validateFunction: validateChoose,
    createFunction: createChoose,
    childElements: [
        new ChildElementSchema({
            type: ElementType.When,
            required: true
        }),
        new ChildElementSchema({
            type: ElementType.Otherwise,
            atMostOne: true,
            mustBeLast: true
        })
    ]
});

const importSchema = new ElementSchema({
    name: "Import",
    description: "Enables a project file to import another project file. There may be zero or more Import elements in a project.",
    msdn: "https://msdn.microsoft.com/en-us/library/92x05xfs.aspx",
    validateFunction: validateImport,
    createFunction: createImport,
    attributes: [
        new AttributeSchema({
            name: "Condition",
            description: conditionDescription
        }),
        new AttributeSchema({
            name: "Project",
            description: "The path of the project file to import. The path can include wildcards. The matching files are imported in sorted order. By using this feature, you can add code to a project just by adding the code file to a directory.",
            required: true
        })
    ]
});

const importGroupSchema = new ElementSchema({
    name: "ImportGroup",
    description: "Contains a collection of **Import** elements that are grouped under an optional condition. For more information, see [Import Element (MSBuild)](https://msdn.microsoft.com/en-us/library/92x05xfs.aspx).",
    msdn: "https://msdn.microsoft.com/en-us/library/ff606262.aspx",
    validateFunction: validateImportGroup,
    createFunction: createImportGroup,
    attributes: [
        new AttributeSchema({
            name: "Condition",
            description: conditionDescription
        })
    ],
    childElements: [
        new ChildElementSchema({
            type: ElementType.Import
        })
    ]
});

const itemSchema = new ElementSchema({
    name: "Item",
    description: "Contains a user-defined item and its metadata. Every item that is used in a MSBuild project must be specified as a child of an **ItemGroup** element.",
    msdn: "https://msdn.microsoft.com/en-us/library/ms164283.aspx",
    validateFunction: validateItem,
    createFunction: createItem,
    attributes: [
        new AttributeSchema({
            name: "Include",
            description: "The file or wildcard to include in the list of items.",
            required: true
        }),
        new AttributeSchema({
            name: "Exclude",
            description: "The file or wildcard to exclude from the list of items."
        }),
        new AttributeSchema({
            name: "Condition",
            description: conditionDescription
        }),
        new AttributeSchema({
            name: "Remove",
            description: "The file or wildcard to remove from the list of items.\nThis attribute is valid only if it's specified for an item in an **ItemGroup** that's in a **Target**."
        }),
        new AttributeSchema({
            name: "KeepMetadata",
            description: "The metadata for the source items to add to the target items. Only the metadata whose names are specified in the semicolon-delimited list are transferred from a source item to a target item. For more information, see [MSBuild Items](https://msdn.microsoft.com/en-us/library/ms171453.aspx).\nThis attribute is valid only if it's specified for an item in an **ItemGroup** that's in a **Target**."
        }),
        new AttributeSchema({
            name: "RemoveMetadata",
            description: "The metadata for the source items to not transfer to the target items. All metadata is transferred from a source item to a target item except metadata whose names are contained in the semicolon-delimited list of names. For more information, see [MSBuild Items](https://msdn.microsoft.com/en-us/library/ms171453.aspx).\nThis attribute is valid only if it's specified for an item in an **ItemGroup** that's in a **Target**."
        }),
        new AttributeSchema({
            name: "KeepDuplicates",
            description: "Specifies whether an item should be added to the target group if it's an exact duplicate of an existing item. If the source and target item have the same **Include** value but different metadata, the item is added even if **KeepDuplicates** is set to **false**.\nFor more information, see [MSBuild Items](https://msdn.microsoft.com/en-us/library/ms171453.aspx).\nThis attribute is valid only if it's specified for an item in an **ItemGroup** that's in a **Target**."
        })
    ],
    additionalChildElements: new ChildElementSchema({
        type: ElementType.ItemMetadata
    })
});

const itemDefinitionGroupSchema = new ElementSchema({
    name: "ItemDefinitionGroup",
    description: "The **ItemDefinitionGroup** element lets you define a set of Item Definitions, which are metadata values that are applied to all items in the project, by default. ItemDefinitionGroup supersedes the need to use the [CreateItem Task](https://msdn.microsoft.com/en-us/library/s2y3e43x.aspx) and the [CreateProperty Task](https://msdn.microsoft.com/en-us/library/63ckb9s9.aspx). For more information, see [Item Definitions](https://msdn.microsoft.com/en-us/library/bb651788.aspx).",
    msdn: "https://msdn.microsoft.com/en-us/library/bb629392.aspx",
    validateFunction: validateItemDefinitionGroup,
    createFunction: createItemDefinitionGroup,
    attributes: [
        new AttributeSchema({
            name: "Condition",
            description: conditionDescription
        })
    ],
    additionalChildElements: new ChildElementSchema({
        type: ElementType.Item
    })
});

const itemGroupSchema = new ElementSchema({
    name: "ItemGroup",
    description: "A grouping element for individual items. Items are specified by using the Item element. There may be zero or more ItemGroup elements in a project.",
    msdn: "https://msdn.microsoft.com/en-us/library/646dk05y.aspx",
    validateFunction: validateItemGroup,
    createFunction: createItemGroup,
    attributes: [
        new AttributeSchema({
            name: "Condition",
            description: conditionDescription
        }),
        new AttributeSchema({
            name: "Label",
            description: labelDescription
        })
    ],
    additionalChildElements: new ChildElementSchema({
        type: ElementType.Item
    })
});

const itemMetadataSchema = new ElementSchema({
    name: "ItemMetadata",
    description: "Contains a user-defined item metadata key, which contains the item metadata value. An item may have any number of metadata key-value pairs.",
    msdn: "https://msdn.microsoft.com/en-us/library/ms164284.aspx",
    validateFunction: validateItemMetadata,
    createFunction: createItemMetadata,
    attributes: [
        new AttributeSchema({
            name: "Condition",
            description: conditionDescription
        })
    ],
    allowTextChildElements: true
});

const onErrorSchema = new ElementSchema({
    name: "OnError",
    description: "Causes one or more targets to execute, if the **ContinueOnError** attribute is **false** for a failed task.",
    msdn: "https://msdn.microsoft.com/en-us/library/ms164285.aspx",
    validateFunction: validateOnError,
    createFunction: createOnError,
    attributes: [
        new AttributeSchema({
            name: "Condition",
            description: conditionDescription
        }),
        new AttributeSchema({
            name: "ExecuteTargets",
            description: "The targets to execute if a task fails. Separate multiple targets with semicolons. Multiple targets are executed in the order specified.",
            required: true
        })
    ]
});

const otherwiseSchema = new ElementSchema({
    name: "Otherwise",
    description: "Specifies the block of code to execute if and only if the conditions of all **When** elements evaluate to **false**.",
    msdn: "https://msdn.microsoft.com/en-us/library/ms164286.aspx",
    validateFunction: validateOtherwise,
    createFunction: createOtherwise,
    childElements: [
        new ChildElementSchema({
            type: ElementType.Choose
        }),
        new ChildElementSchema({
            type: ElementType.ItemGroup,
        }),
        new ChildElementSchema({
            type: ElementType.PropertyGroup
        })
    ]
});

const outputSchema = new ElementSchema({
    name: "Output",
    description: "Stores task output values in items and properties.",
    msdn: "https://msdn.microsoft.com/en-us/library/ms164287.aspx",
    validateFunction: validateOutput,
    createFunction: createOutput,
    attributes: [
        new AttributeSchema({
            name: "Condition",
            description: conditionDescription
        }),
        new AttributeSchema({
            name: "ItemName",
            description: "Either the **PropertyName** or **ItemName** attribute is required.\nThe item that receives the task's output parameter value. Your project can then reference the item with the *@(ItemName)* syntax. The item name can either be a new item name or a name that is already defined in the project.\nThis attribute cannot be used if **PropertyName** is also being used.",
            required: true,
            notWith: "PropertyName"
        }),
        new AttributeSchema({
            name: "PropertyName",
            description: "Either the **PropertyName** or **ItemName** attribute is required.\nThe property that receives the task's output parameter value. Your project can then reference the property with the *$(PropertyName)* syntax. This property name can either be a new property name or a name that is already defined in the project.\nThis attribute cannot be used if **ItemName** is also being used.",
            required: true,
            notWith: "ItemName"
        }),
        new AttributeSchema({
            name: "TaskParameter",
            description: "The name of the task's output parameter.",
            required: true
        })
    ]
});

const parameterSchema = new ElementSchema({
    name: "Parameter",
    description: "Contains information about a specific parameter for a task that is generated by a **UsingTask** **TaskFactory**. The name of the element is the name of the parameter. For more informations, see [UsingTask Element (MSBuild)](https://msdn.microsoft.com/en-us/library/t41tzex2.aspx).",
    msdn: "https://msdn.microsoft.com/en-us/library/ff606257.aspx",
    validateFunction: validateParameter,
    createFunction: createParameter,
    attributes: [
        new AttributeSchema({
            name: "ParameterType",
            description: "The .NET type of the parameter, for example, \"System.String\"."
        }),
        new AttributeSchema({
            name: "Output",
            description: "If **true**, this parameter is an output parameter for the task. By default, the value is **false**."
        }),
        new AttributeSchema({
            name: "Required",
            description: "If **true**, this parameter is an required parameter for the task. By default, the value is **false**."
        })
    ]
});

const parameterGroupSchema = new ElementSchema({
    name: "ParameterGroup",
    description: "Contains an optional list of parameters that will be present on the task that is generated by a **UsingTask TaskFactory**. For more information, see [UsingTask Element (MSBuild)](https://msdn.microsoft.com/en-us/library/t41tzex2.aspx).",
    msdn: "https://msdn.microsoft.com/en-us/library/ff606260.aspx",
    validateFunction: validateParameterGroup,
    createFunction: createParameterGroup,
    additionalChildElements: new ChildElementSchema({
        type: ElementType.Parameter
    })
});

const projectSchema = new ElementSchema({
    name: "Project",
    description: "**Required** root element of an MSBuild project file.",
    msdn: "https://msdn.microsoft.com/en-us/library/bcxfsh87.aspx",
    validateFunction: validateProject,
    createFunction: createProject,
    attributes: [
        new AttributeSchema({
            name: "DefaultTargets",
            description: "The default target or targets to be the entry point of the build if no target has been specified. Multiple targets are semi-colon (;) delimited.\nIf no default target is specified in either the **DefaultTargets** attribute or the MSBuild command line, the engine executes the first target in the project file after the Import elements have been evaluated."
        }),
        new AttributeSchema({
            name: "InitialTargets",
            description: "The initial target or targets to be run before the targets specified in the **DefaultTargets** attribute or on the command line. Multiple targets are semi-colon (;) delimited."
        }),
        new AttributeSchema({
            name: "ToolsVersion",
            description: "The version of the toolset MSBuild uses to determine the values for $(MSBuildBinPath) and $(MSBuildToolsPath)."
        }),
        new AttributeSchema({
            name: "TreatAsLocalProperty",
            description: "Property names that won't be considered to be global. This attribute prevents specific command-line properties from overriding property values that are set in a project or targets file and all subsequent imports. Multiple properties are semi-colon (;) delimited.\nNormally, global properties override property values that are set in the project or targets file. If the property is listed in the **TreatAsLocalProperty** value, the global property value doesn't override property values that are set in that file and any subsequent imports. For more information, see [How to: Build the Same Source Files with Different Options](https://msdn.microsoft.com/en-us/library/ms171481.aspx)."
        }),
        new AttributeSchema({
            name: "Xmlns",
            description: `The **xmlns** attribute must have the value of "http://schemas.microsoft.com/developer/msbuild/2003".`,
            required: true
        })
    ],
    childElements: [
        new ChildElementSchema({
            type: ElementType.Choose
        }),
        new ChildElementSchema({
            type: ElementType.Import
        }),
        new ChildElementSchema({
            type: ElementType.ImportGroup
        }),
        new ChildElementSchema({
            type: ElementType.ItemDefinitionGroup
        }),
        new ChildElementSchema({
            type: ElementType.ItemGroup
        }),
        new ChildElementSchema({
            type: ElementType.ProjectExtensions,
            atMostOne: true
        }),
        new ChildElementSchema({
            type: ElementType.PropertyGroup
        }),
        new ChildElementSchema({
            type: ElementType.Target
        }),
        new ChildElementSchema({
            type: ElementType.UsingTask
        })
    ]
});

const projectExtensionsSchema = new ElementSchema({
    name: "ProjectExtensions",
    description: "Provides a way to persist non-MSBuild information in an MSBuild project file. There may be zero or one ProjectExtensions elements in a project.",
    msdn: "https://msdn.microsoft.com/en-us/library/ycwcwzs7.aspx",
    validateFunction: validateProjectExtensions,
    createFunction: createProjectExtensions,
    dontValidateChildElements: true
});

const propertySchema = new ElementSchema({
    name: "Property",
    description: "Contains a user defined property name and value. Every property used in an MSBuild project must be specified as a child of a **PropertyGroup** element.",
    msdn: "https://msdn.microsoft.com/en-us/library/ms164288.aspx",
    validateFunction: validateProperty,
    createFunction: createProperty,
    attributes: [
        new AttributeSchema({
            name: "Condition",
            description: conditionDescription
        })
    ],
    allowTextChildElements: true
});

const propertyGroupSchema = new ElementSchema({
    name: "PropertyGroup",
    description: "A grouping element for individual properties. Properties are specified by using the Property element. There may be zero or more PropertyGroup elements in a project.",
    msdn: "https://msdn.microsoft.com/en-us/library/t4w159bs.aspx",
    validateFunction: validatePropertyGroup,
    createFunction: createPropertyGroup,
    attributes: [
        new AttributeSchema({
            name: "Condition",
            description: conditionDescription,
        }),
        new AttributeSchema({
            name: "Label",
            description: labelDescription
        })
    ],
    additionalChildElements: new ChildElementSchema({
        type: ElementType.Property
    })
});

const targetSchema = new ElementSchema({
    name: "Target",
    description: "Contains a set of tasks for MSBuild to sequentially execute. Tasks are specified by using the Task element. There may be zero or more Target elements in a project.",
    msdn: "https://msdn.microsoft.com/en-us/library/t50z2hka.aspx",
    validateFunction: validateTarget,
    createFunction: createTarget,
    attributes: [
        new AttributeSchema({
            name: "AfterTargets",
            description: "A semicolon-separated list of target names. When specified, indicates that this target should run after the specified target or targets. This lets the project author extend an existing set of targets without modifying them directly. For more information, see [Target Build Order](https://msdn.microsoft.com/en-us/library/ee216359.aspx)."
        }),
        new AttributeSchema({
            name: "BeforeTargets",
            description: "A semicolon-separated list of target names.  When specified, indicates that this target should run before the specified target or targets. This lets the project author extend an existing set of targets without modifying them directly. For more information, see [Target Build Order](https://msdn.microsoft.com/en-us/library/ee216359.aspx)."
        }),
        new AttributeSchema({
            name: "Condition",
            description: conditionDescription
        }),
        new AttributeSchema({
            name: "DependsOnTargets",
            description: "The targets that must be executed before this target can be executed or top-level dependency analysis can occur. Multiple targets are separated by semicolons."
        }),
        new AttributeSchema({
            name: "Inputs",
            description: "The files that form inputs into this target. Multiple files are separated by semicolons. The timestamps of the files will be compared with the timestamps of files in **Outputs** to determine whether the **Target** is up to date. For more information, see [Incremental Builds, How to: Build Incrementally](https://msdn.microsoft.com/en-us/library/ee264087.aspx), and [MSBuild Transforms](https://msdn.microsoft.com/en-us/library/ms171476.aspx)."
        }),
        new AttributeSchema({
            name: "KeepDuplicateOutputs",
            description: "If **true**, multiple references to the same item in the target's Returns are recorded. By default, this attribute is **false**."
        }),
        new AttributeSchema({
            name: "Name",
            description: "The name of the target.",
            required: true
        }),
        new AttributeSchema({
            name: "Outputs",
            description: "The files that form outputs into this target. Multiple files are separated by semicolons. The timestamps of the files will be compared with the timestamps of files in **Inputs** to determine whether the **Target** is up to date. For more information, see [Incremental Builds, How to: Build Incrementally](https://msdn.microsoft.com/en-us/library/ms171483.aspx), and [MSBuild Transforms](https://msdn.microsoft.com/en-us/library/ms171476.aspx)."
        }),
        new AttributeSchema({
            name: "Returns",
            description: "The set of items that will be made available to tasks that invoke this target, for example, MSBuild tasks. Multiple targets are separated by semicolons. If the targets in the file have no **Returns** attributes, the Outputs attributes are used instead for this purpose."
        })
    ],
    childElements: [
        new ChildElementSchema({
            type: ElementType.TargetItemGroup
        }),
        new ChildElementSchema({
            type: ElementType.PropertyGroup
        }),
        new ChildElementSchema({
            type: ElementType.OnError,
            atMostOne: true,
            mustBeLast: true
        })
    ],
    additionalChildElements: new ChildElementSchema({
        type: ElementType.Task
    })
});

const targetItemSchema = new ElementSchema({
    name: "Item",
    description: "Contains a user-defined item and its metadata. Every item that is used in a MSBuild project must be specified as a child of an **ItemGroup** element.",
    msdn: "https://msdn.microsoft.com/en-us/library/ms164283.aspx",
    validateFunction: validateItem,
    createFunction: createItem,
    attributes: [
        new AttributeSchema({
            name: "Include",
            description: "The file or wildcard to include in the list of items.",
            requiredIfNotDefined: "Exclude"
        }),
        new AttributeSchema({
            name: "Exclude",
            description: "The file or wildcard to exclude from the list of items."
        }),
        new AttributeSchema({
            name: "Condition",
            description: conditionDescription
        }),
        new AttributeSchema({
            name: "Remove",
            description: "The file or wildcard to remove from the list of items.\nThis attribute is valid only if it's specified for an item in an **ItemGroup** that's in a **Target**."
        }),
        new AttributeSchema({
            name: "KeepMetadata",
            description: "The metadata for the source items to add to the target items. Only the metadata whose names are specified in the semicolon-delimited list are transferred from a source item to a target item. For more information, see [MSBuild Items](https://msdn.microsoft.com/en-us/library/ms171453.aspx).\nThis attribute is valid only if it's specified for an item in an **ItemGroup** that's in a **Target**."
        }),
        new AttributeSchema({
            name: "RemoveMetadata",
            description: "The metadata for the source items to not transfer to the target items. All metadata is transferred from a source item to a target item except metadata whose names are contained in the semicolon-delimited list of names. For more information, see [MSBuild Items](https://msdn.microsoft.com/en-us/library/ms171453.aspx).\nThis attribute is valid only if it's specified for an item in an **ItemGroup** that's in a **Target**."
        }),
        new AttributeSchema({
            name: "KeepDuplicates",
            description: "Specifies whether an item should be added to the target group if it's an exact duplicate of an existing item. If the source and target item have the same **Include** value but different metadata, the item is added even if **KeepDuplicates** is set to **false**.\nFor more information, see [MSBuild Items](https://msdn.microsoft.com/en-us/library/ms171453.aspx).\nThis attribute is valid only if it's specified for an item in an **ItemGroup** that's in a **Target**."
        })
    ],
    additionalChildElements: new ChildElementSchema({
        type: ElementType.ItemMetadata
    })
});

const targetItemGroupSchema = new ElementSchema({
    name: "ItemGroup",
    description: "A grouping element for individual items. Items are specified by using the Item element. There may be zero or more ItemGroup elements in a project.",
    msdn: "https://msdn.microsoft.com/en-us/library/646dk05y.aspx",
    validateFunction: validateItemGroup,
    createFunction: createItemGroup,
    attributes: [
        new AttributeSchema({
            name: "Condition",
            description: conditionDescription
        }),
        new AttributeSchema({
            name: "Label",
            description: labelDescription
        })
    ],
    additionalChildElements: new ChildElementSchema({
        type: ElementType.TargetItem
    })
});

const taskBodySchema = new ElementSchema({
    name: "TaskBody",
    description: "Contains the data that is passed to a UsingTask TaskFactory. For more information, see [UsingTask Element (MSBuild)](https://msdn.microsoft.com/en-us/library/t41tzex2.aspx).",
    msdn: "https://msdn.microsoft.com/en-us/library/ff606253.aspx",
    validateFunction: validateTaskBody,
    createFunction: createTaskBody,
    attributes: [
        new AttributeSchema({
            name: "Evaluate",
            description: "If **true**, MSBuild evaluates any inner elements, and expands items and properties before it passes the information to the **TaskFactory** when the task is instantiated."
        })
    ]
});

const usingTaskSchema = new ElementSchema({
    name: "UsingTask",
    description: "Provides a way to register tasks in MSBuild. There may be zero or more UsingTask elements in a project.",
    msdn: "https://msdn.microsoft.com/en-us/library/t41tzex2.aspx",
    validateFunction: validateUsingTask,
    createFunction: createUsingTask,
    attributes: [
        new AttributeSchema({
            name: "AssemblyFile",
            description: "Either the **AssemblyName** or the **AssemblyFile** attribute is required.\nThe file path of the assembly. This attribute accepts full paths or relative paths. Relative paths are relative to the directory of the project file or targets file where the **UsingTask** element is declared. Using this attribute is equivalent to loading an assembly by using the [LoadFrom](https://msdn.microsoft.com/en-us/library/1009fa28.aspx) method in .NET.\nYou cannot use this attribute if the **AssemblyName** attribute is used.",
            required: true,
            notWith: "AssemblyName"
        }),
        new AttributeSchema({
            name: "AssemblyName",
            description: "Either the **AssemblyName** attribute or the **AssemblyFile** attribute is required.\nThe name of the assembly to load. The **AssemblyName** attribute accepts strong-named assemblies, although strong-naming is not required. Using this attribute is equivalent to loading an assembly by using the [Load](https://msdn.microsoft.com/en-us/library/ky3942xh.aspx) method in .NET.\nYou cannot use this attribute if the **AssemblyFile** attribute is used.",
            required: true,
            notWith: "AssemblyFile"
        }),
        new AttributeSchema({
            name: "Condition",
            description: conditionDescription
        }),
        new AttributeSchema({
            name: "TaskFactory",
            description: "Specifies the class in the assembly that is responsible for generating instances of the specified **Task** name.  The user may also specify a **TaskBody** as a child element that the task factory receives and uses to generate the task. The contents of the **TaskBody** are specific to the task factory."
        }),
        new AttributeSchema({
            name: "TaskName",
            description: "The name of the task to reference from an assembly. If ambiguities are possible, this attribute should always specify full namespaces. If there are ambiguities, MSBuild chooses an arbitrary match, which could produce unexpected results.",
            required: true
        })
    ],
    childElements: [
        new ChildElementSchema({
            type: ElementType.ParameterGroup
        }),
        new ChildElementSchema({
            type: ElementType.TaskBody
        })
    ]
});

const whenElementSchema = new ElementSchema({
    name: "When",
    description: "Specifies a possible block of code for the **Choose** element to select.",
    msdn: "https://msdn.microsoft.com/en-us/library/ms164289.aspx",
    validateFunction: validateWhen,
    createFunction: createWhen,
    attributes: [
        new AttributeSchema({
            name: "Condition",
            description: conditionDescription,
            required: true
        })
    ],
    childElements: [
        new ChildElementSchema({
            type: ElementType.Choose
        }),
        new ChildElementSchema({
            type: ElementType.ItemGroup
        }),
        new ChildElementSchema({
            type: ElementType.PropertyGroup
        })
    ]
});

export interface TaskSchemaContents {
    name: string,
    description: string,
    msdn: string,
    attributes?: AttributeSchema[],
    allowAllAttributes?: boolean
}

export class TaskSchema extends ElementSchema {
    constructor(contents: TaskSchemaContents) {
        super({
            name: contents.name,
            description: contents.description,
            msdn: contents.msdn,
            validateFunction: (xmlElement: xml.Element | xml.EmptyElement, issues: qub.ArrayList<qub.Issue>) => validateElement(ElementType.Task, xmlElement, issues),
            createFunction: (xmlElement: xml.Element | xml.EmptyElement) => new TaskElement(xmlElement),
            attributes: new qub.ArrayList<AttributeSchema>([
                new AttributeSchema({
                    name: "Condition",
                    description: conditionDescription
                }),
                new AttributeSchema({
                    name: "ContinueOnError",
                    description: "Can contain one of the following values:\n- **WarnAndContinue** or **true**. When a task fails, subsequent tasks in the [Target](https://msdn.microsoft.com/en-us/library/t50z2hka.aspx) element and the build continue to execute, and all errors from the task are treated as warnings.\n- **ErrorAndContinue**. When a task fails, subsequent tasks in the **Target** element and the build continue to execute, and all errors from the task are treated as errors.\n- **ErrorAndStop** or **false** (default). When a task fails, the remaining tasks in the **Target** element and the build aren't executed, and the entire **Target** element and the build is considered to have failed.\nVersions of the .NET Framework before 4.5 supported only the **true** and **false** values.\nFor more information, see [How to: Ignore language.Errors in Tasks.](https://msdn.microsoft.com/en-us/library/ms171484.aspx)"
                })
            ]).concatenate(contents.attributes).toArray(),
            allowAllAttributes: contents.allowAllAttributes,
            childElements: [
                new ChildElementSchema({
                    type: ElementType.Output
                })
            ]
        })
    }
}

const alTaskSchema = new TaskSchema({
    name: "AL",
    description: `The AL task wraps AL.exe, a tool that is distributed with the Windows Software Development Kit (SDK). This Assembly Linker tool is used to create an assembly with a manifest from one or more files that are either modules or resource files. Compilers and development environments might already provide these capabilities, so it is often not necessary to use this task directly. The Assembly Linker is most useful to developers needing to create a single assembly from multiple component files, such as those that might be produced from mixed-language development. This task does not combine the modules into a single assembly file; the individual modules must still be distributed and available in order for the resulting assembly to load correctly. For more information on AL.exe, see [Al.exe (Assembly Linker)](https://msdn.microsoft.com/en-us/library/c405shex.aspx).`,
    msdn: "https://msdn.microsoft.com/en-us/library/cywecfx9.aspx",
    attributes: [
        new AttributeSchema({
            name: "AlgorithmID",
            description: `Optional **String** parameter.\nSpecifies an algorithm to hash all files in a multifile assembly except the file that contains the assembly manifest. For more information, see the documentation for the */algid* option in [Al.exe (Assembly Linker)](https://msdn.microsoft.com/en-us/library/c405shex.aspx).`
        }),
        new AttributeSchema({
            name: "BaseAddress",
            description: `Optional **String** parameter.\nSpecifies the address at which a DLL will be loaded on the user’s computer at run time. Applications load faster if you specify the base address of the DLLs, rather than letting the operating system relocate the DLLs in the process space. This parameter corresponds to the */base[address]* option in [Al.exe (Assembly Linker)](https://msdn.microsoft.com/en-us/library/c405shex.aspx).`
        }),
        new AttributeSchema({
            name: "CompanyName",
            description: `Optional **String** parameter.\nSpecifies a string for the *Company* field in the assembly. For more information, see the documentation for the */comp[any]* option in [Al.exe (Assembly Linker)](https://msdn.microsoft.com/en-us/library/c405shex.aspx).`
        }),
        new AttributeSchema({
            name: "Configuration",
            description: `Optional **String** parameter.\nSpecifies a string for the *Configuration* field in the assembly. For more information, see the documentation for the */config[uration]* option in [Al.exe (Assembly Linker)](https://msdn.microsoft.com/en-us/library/c405shex.aspx).`
        }),
        new AttributeSchema({
            name: "Copyright",
            description: `Optional **String** parameter.\nSpecifies a string for the *Copyright* field in the assembly. For more information, see the documentation for the */copy[right]* option in [Al.exe (Assembly Linker)](https://msdn.microsoft.com/en-us/library/c405shex.aspx).`
        }),
        new AttributeSchema({
            name: "Culture",
            description: `Optional **String** parameter.\nSpecifies the culture string to associate with the assembly. For more information, see the documentation for the */c[ulture]* option in [Al.exe (Assembly Linker)](https://msdn.microsoft.com/en-us/library/c405shex.aspx).`
        }),
        new AttributeSchema({
            name: "DelaySign",
            description: `Optional **Boolean** parameter.\n *true* to place only the public key in the assembly; *false* to fully sign the assembly. For more information, see the documentation for the */delay[sign]* option in [Al.exe (Assembly Linker)](https://msdn.microsoft.com/en-us/library/c405shex.aspx).`
        }),
        new AttributeSchema({
            name: "Description",
            description: `Optional **String** parameter.\nSpecifies a string for the *Description* field in the assembly. For more information, see the documentation for the */descr[iption]* option in [Al.exe (Assembly Linker)](https://msdn.microsoft.com/en-us/library/c405shex.aspx).`
        }),
        new AttributeSchema({
            name: "EmbedResources",
            description: `Optional **[ITaskItem](https://msdn.microsoft.com/en-us/library/microsoft.build.framework.itaskitem.aspx)[]** parameter.\nEmbeds the specified resources in the image that contains the assembly manifest. This task copies the contents of the resource file into the image. The items passed in to this parameter may have optional metadata attached to them called *LogicalName* and *Access*. The *LogicalName* metadata is used to specify the internal identifier for the resource. The *Access* metadata can be set to private in order to make the resource not visible to other assemblies. For more information, see the documentation for the */embed*[resource] option in [Al.exe (Assembly Linker)](https://msdn.microsoft.com/en-us/library/c405shex.aspx).`
        }),
        new AttributeSchema({
            name: "EvidenceFile",
            description: `Optional **String** parameter.\nEmbeds the specified file in the assembly with the resource name of *Security.Evidence*.\nYou cannot use *Security.Evidence* for regular resources. This parameter corresponds to the */e[vidence]* option in [Al.exe (Assembly Linker)](https://msdn.microsoft.com/en-us/library/c405shex.aspx).`
        }),
        new AttributeSchema({
            name: "ExitCode",
            description: `Optional **Int32** output read-only parameter.\nSpecifies the exit code provided by the executed command.`
        }),
        new AttributeSchema({
            name: "FileVersion",
            description: `Optional **String** parameter.\nSpecifies a string for the *File Version* field in the assembly. For more information, see the documentation for the */fileversion* option in [Al.exe (Assembly Linker)](https://msdn.microsoft.com/en-us/library/c405shex.aspx).`
        }),
        new AttributeSchema({
            name: "Flags",
            description: `Optional **String** parameter.\nSpecifies a value for the *Flags* field in the assembly. For more information, see the documentation for the */flags* option in [Al.exe (Assembly Linker)](https://msdn.microsoft.com/en-us/library/c405shex.aspx).`
        }),
        new AttributeSchema({
            name: "GenerateFullPaths",
            description: `Optional **Boolean** parameter.\nCauses the task to use the absolute path for any files that are reported in an error message. This parameter corresponds to the */fullpaths* option in [Al.exe (Assembly Linker)](https://msdn.microsoft.com/en-us/library/c405shex.aspx).`
        }),
        new AttributeSchema({
            name: "KeyContainer",
            description: `Optional **String** parameter.\nSpecifies a container that holds a key pair. This will sign the assembly (give it a strong name) by inserting a public key into the assembly manifest. The task will then sign the final assembly with the private key. For more information, see the documentation for the */keyn[ame]* option in [Al.exe (Assembly Linker)](https://msdn.microsoft.com/en-us/library/c405shex.aspx).`
        }),
        new AttributeSchema({
            name: "KeyFile",
            description: `Optional **String** parameter.\nSpecifies a file that contains a key pair or just a public key to sign an assembly. The compiler inserts the public key in the assembly manifest and then signs the final assembly with the private key. For more information, see the documentation for the */keyf[ile]* option in [Al.exe (Assembly Linker)](https://msdn.microsoft.com/en-us/library/c405shex.aspx).`
        }),
        new AttributeSchema({
            name: "LinkResources",
            description: `Optional **[ITaskItem](https://msdn.microsoft.com/en-us/library/microsoft.build.framework.itaskitem.aspx)[]** parameter.\nLinks the specified resource files to an assembly. The resource becomes part of the assembly, but the file is not copied. The items passed in to this parameter may have optional metadata attached to them called *LogicalName*, *Target*, and *Access*. The *LogicalName* metadata is used to specify the internal identifier for the resource. The *Target* metadata can specify the path and filename to which the task copies the file, after which it compiles this new file into the assembly. The *Access* metadata can be set to *private* in order to make the resource not visible to other assemblies. For more information, see the documentation for the */link[resource]* option in [Al.exe (Assembly Linker)](https://msdn.microsoft.com/en-us/library/c405shex.aspx).`
        }),
        new AttributeSchema({
            name: "MainEntryPoint",
            description: `Optional **String** parameter.\nSpecifies the fully qualified name *(class.method)* of the method to use as an entry point when converting a module to an executable file. This parameter corresponds to the */main* option in [Al.exe (Assembly Linker)](https://msdn.microsoft.com/en-us/library/c405shex.aspx).`
        }),
        new AttributeSchema({
            name: "OutputAssembly",
            description: `Required [ITaskItem](https://msdn.microsoft.com/en-us/library/microsoft.build.framework.itaskitem.aspx) output parameter.\nSpecifies the name of the file generated by this task. This parameter corresponds to the */out* option in [Al.exe (Assembly Linker)](https://msdn.microsoft.com/en-us/library/c405shex.aspx).`,
            required: true
        }),
        new AttributeSchema({
            name: "Platform",
            description: `Optional **String** parameter.\nLimits which platform this code can run on; must be one of *x86*, *Itanium*, *x64*, or *anycpu*. The default is *anycpu*. This parameter corresponds to the */platform* option in [Al.exe (Assembly Linker)](https://msdn.microsoft.com/en-us/library/c405shex.aspx).`
        }),
        new AttributeSchema({
            name: "ProductName",
            description: `Optional **String** parameter.\nSpecifies a string for the *Product* field in the assembly. For more information, see the documentation for the */prod[uct]* option in [Al.exe (Assembly Linker)](https://msdn.microsoft.com/en-us/library/c405shex.aspx).`
        }),
        new AttributeSchema({
            name: "ProductVersion",
            description: `Optional **String** parameter.\nSpecifies a string for the *ProductVersion* field in the assembly. For more information, see the documentation for the */productv[ersion]* option in [Al.exe (Assembly Linker)](https://msdn.microsoft.com/en-us/library/c405shex.aspx).`
        }),
        new AttributeSchema({
            name: "ResponseFiles",
            description: `Optional **String[]** parameter.\nSpecifies the response files that contain additional options to pass through to the Assembly Linker.`
        }),
        new AttributeSchema({
            name: "SdkToolsPath",
            description: `Optional **String** parameter.\nSpecifies the path to the SDK tools, such as resgen.exe.`
        }),
        new AttributeSchema({
            name: "SourceModules",
            description: `Optional **[ITaskItem](https://msdn.microsoft.com/en-us/library/microsoft.build.framework.itaskitem.aspx)[]** parameter.\nOne or more modules to be compiled into an assembly. The modules will be listed in the manifest of the resulting assembly, and will still need to distributed and available in order for the assembly to load. The items passed into this parameter may have additional metadata called *Target*, which specifies the path and filename to which the task copies the file, after which it compiles this new file into the assembly. For more information, see the documentation for [Al.exe (Assembly Linker)](https://msdn.microsoft.com/en-us/library/c405shex.aspx). This parameter corresponds to the list of modules passed into Al.exe without a specific switch.`
        }),
        new AttributeSchema({
            name: "TargetType",
            description: `Optional **String** parameter.\nSpecifies the file format of the output file: *library* (code library), *exe* (console application), or *win* (Windows-based application). The default is *library*. This parameter corresponds to the */t[arget]* option in [Al.exe (Assembly Linker)](https://msdn.microsoft.com/en-us/library/c405shex.aspx).`
        }),
        new AttributeSchema({
            name: "TemplateFile",
            description: `Optional **String** parameter.\nSpecifies the assembly from which to inherit all assembly metadata, except the culture field. The specified assembly must have a strong name.\nAn assembly that you create with the *TemplateFile* parameter will be a satellite assembly. This parameter corresponds to the */template* option in [Al.exe (Assembly Linker)](https://msdn.microsoft.com/en-us/library/c405shex.aspx).`
        }),
        new AttributeSchema({
            name: "Timeout",
            description: `Optional **Int32** parameter.\nSpecifies the amount of time, in milliseconds, after which the task executable is terminated. The default value is *Int.MaxValue*, indicating that there is no time out period.`
        }),
        new AttributeSchema({
            name: "Title",
            description: `Optional **String** parameter.\nSpecifies a string for the *Title* field in the assembly. For more information, see the documentation for the */title* option in [Al.exe (Assembly Linker)](https://msdn.microsoft.com/en-us/library/c405shex.aspx).`
        }),
        new AttributeSchema({
            name: "ToolPath",
            description: `Optional **String** parameter.\nSpecifies the location from where the task will load the underlying executable file (Al.exe). If this parameter is not specified, the task uses the SDK installation path corresponding to the version of the framework that is running MSBuild.`
        }),
        new AttributeSchema({
            name: "Trademark",
            description: `Optional **String** parameter.\nSpecifies a string for the *Trademark* field in the assembly. For more information, see the documentation for the */trade[mark]* option in [Al.exe (Assembly Linker)](https://msdn.microsoft.com/en-us/library/c405shex.aspx).`
        }),
        new AttributeSchema({
            name: "Version",
            description: `Optional **String** parameter.\nSpecifies the version information for this assembly. The format of the string is *major.minor.build.revision*. The default value is 0. For more information, see the documentation for the */v[ersion]* option in [Al.exe (Assembly Linker)](https://msdn.microsoft.com/en-us/library/c405shex.aspx).`
        }),
        new AttributeSchema({
            name: "Win32Icon",
            description: `Optional **String** parameter.\nInserts an .ico file in the assembly. The .ico file gives the output file the desired appearance in File Explorer. This parameter corresponds to the */win32icon* option in [Al.exe (Assembly Linker)](https://msdn.microsoft.com/en-us/library/c405shex.aspx).`
        }),
        new AttributeSchema({
            name: "Win32Resource",
            description: `Optional **String** parameter.\nInserts a Win32 resource (.res file) in the output file. For more information, see the documentation for the */win32res* option in [Al.exe (Assembly Linker)](https://msdn.microsoft.com/en-us/library/c405shex.aspx).`
        })
    ]
});

const aspNetCompilerTaskSchema = new TaskSchema({
    name: "AspNetCompiler",
    description: `The *AspNetCompiler* task wraps aspnet_compiler.exe, a utility to precompile ASP.NET applications.`,
    msdn: `https://msdn.microsoft.com/en-us/library/ms164291.aspx`,
    attributes: [
        new AttributeSchema({
            name: "AllowPartiallyTrustedCallers",
            description: `Optional **Boolean** parameter.\nIf this parameter is *true*, the strong-name assembly will allow partially trusted callers.`
        }),
        new AttributeSchema({
            name: "Clean",
            description: `Optional **Boolean** parameter.\nIf this parameter is *true*, the precompiled application will be built clean. Any previously compiled components will be recompiled. The default value is *false*. This parameter corresponds to the **-c** switch on aspnet_compiler.exe.`
        }),
        new AttributeSchema({
            name: "Debug",
            description: `Optional **Boolean** parameter.\nIf this parameter is *true*, debug information (.PDB file) is emitted during compilation. The default value is *false*. This parameter corresponds to the **-d** switch on aspnet_compiler.exe.`
        }),
        new AttributeSchema({
            name: "DelaySign",
            description: `Optional **Boolean** parameter.\nIf this parameter is *true*, the assembly is not fully signed when created.`
        }),
        new AttributeSchema({
            name: "FixedNames",
            description: `Optional **Boolean** parameter.\nIf this parameter is *true*, the compiled assemblies will be given fixed names.`
        }),
        new AttributeSchema({
            name: "Force",
            description: `Optional **Boolean** parameter.\nIf this parameter is *true*, the task will overwrite the target directory if it already exists. Existing contents are lost. The default value is *false*. This parameter corresponds to the **-f** switch on aspnet_compiler.exe.`
        }),
        new AttributeSchema({
            name: "KeyContainer",
            description: `Optional **String** parameter.\nSpecifies a strong name key container.`
        }),
        new AttributeSchema({
            name: "KeyFile",
            description: `Optional **String** parameter.\nSpecifies the physical path to the strong name key file.`
        }),
        new AttributeSchema({
            name: "MetabasePath",
            description: `Optional **String** parameter.\nSpecifies the full IIS metabase path of the application. This parameter cannot be combined with the *VirtualPath* or *PhysicalPath* parameters. This parameter corresponds to the **-m** switch on aspnet_compiler.exe.`
        }),
        new AttributeSchema({
            name: "PhysicalPath",
            description: `Optional **String** parameter.\nSpecifies the physical path of the application to be compiled. If this parameter is missing, the IIS metabase is used to locate the application. This parameter corresponds to the **-p** switch on aspnet_compiler.exe.`
        }),
        new AttributeSchema({
            name: "TargetFrameworkMoniker",
            description: `Optional **String** parameter.\nSpecifies the TargetFrameworkMoniker indicating which .NET Framework version of aspnet_compiler.exe should be used. Only accepts .NET Framework monikers.`
        }),
        new AttributeSchema({
            name: "TargetPath",
            description: `Optional **String** parameter.\nSpecifies the physical path to which the application is compiled. If not specified, the application is precompiled in-place.`
        }),
        new AttributeSchema({
            name: "Updateable",
            description: `Optional **Boolean** parameter.\nIf this parameter is *true*, the precompiled application will be updateable. The default value is *false*. This parameter corresponds to the **-u** switch on aspnet_compiler.exe.`
        }),
        new AttributeSchema({
            name: "VirtualPath",
            description: `Optional **String** parameter.\nThe virtual path of the application to be compiled. If *PhysicalPath* specified, the physical path is used to locate the application. Otherwise, the IIS metabase is used, and the application is assumed to be in the default site. This parameter corresponds to the **-v** switch on aspnet_compiler.exe.`
        })
    ]
});

const assignCultureTaskSchema = new TaskSchema({
    name: "AssignCulture",
    description: `This task accepts a list of items that may contain a valid .NET culture identifier string as part of the file name, and produces items that have a metadata named *Culture* containing the corresponding culture identifier. For example, the file name Form1.fr-fr.resx has an embedded culture identifier "fr-fr", so this task will produce an item that has the same filename with the metadata *Culture* equal to *fr-fr*. The task also produces a list of filenames with the culture removed from the filename.`,
    msdn: "https://msdn.microsoft.com/en-us/library/ms164292.aspx",
    attributes: [
        new AttributeSchema({
            name: "AssignedFiles",
            description: `Optional **[ITaskItem](https://msdn.microsoft.com/en-us/library/microsoft.build.framework.itaskitem.aspx)[]** output parameter.\nContains the list of items received in the *Files* parameter, with a *Culture* metadata entry added to each item.\nIf the incoming item from the *Files* parameter already contains a *Culture* metadata entry, the original metadata entry is used.\nThe task only assigns a *Culture* metadata entry if the file name contains a valid culture identifier. The culture identifier must be between the last two dots in the filename.`
        }),
        new AttributeSchema({
            name: "AssignedFilesWithCulture",
            description: `Optional **[ITaskItem](https://msdn.microsoft.com/en-us/library/microsoft.build.framework.itaskitem.aspx)[]** output parameter.\nContains the subset of the items from the *AssignedFiles* parameter that have a *Culture* metadata entry.`
        }),
        new AttributeSchema({
            name: "AssignedFilesWithNoCulture",
            description: `Optional **[ITaskItem](https://msdn.microsoft.com/en-us/library/microsoft.build.framework.itaskitem.aspx)[]** output parameter.\nContains the subset of the items from the *AssignedFiles* parameter that do not have a *Culture* metadata entry.`
        }),
        new AttributeSchema({
            name: "CultureNeutralAssignedFiles",
            description: `Optional **[ITaskItem](https://msdn.microsoft.com/en-us/library/microsoft.build.framework.itaskitem.aspx)[]** output parameter.\nContains the same list of items that is produced in the *AssignedFiles* parameter, except with the culture removed from the file name.\nThe task only removes the culture from the file name if it is a valid culture identifier.`
        }),
        new AttributeSchema({
            name: "Files",
            description: `Required **[ITaskItem](https://msdn.microsoft.com/en-us/library/microsoft.build.framework.itaskitem.aspx)[]** parameter.\nSpecifies the list of files with embedded culture names to assign a culture to.`,
            required: true
        })
    ]
});

const assignProjectConfigurationTaskSchema = new TaskSchema({
    name: "AssignProjectConfiguration",
    description: "This task accepts a list configuration strings and assigns them to specified projects.",
    msdn: "https://msdn.microsoft.com/en-us/library/ff598682.aspx",
    attributes: [
        new AttributeSchema({
            name: "SolutionConfigurationContents",
            description: `Optional **String** output parameter.\nContains an XML string containing a project configuration for each project. The configurations are assigned to the named projects.`
        }),
        new AttributeSchema({
            name: "DefaultToVcxPlatformMapping",
            description: `Optional **String** output parameter.\nContains a semicolon-delimited list of mappings from the platform names used by most types to those used by .vcxproj files. For example: "*AnyCPU=Win32;X86=Win32;X64=X64*"`
        }),
        new AttributeSchema({
            name: "VcxToDefaultPlatformMapping",
            description: `Optional **String** output parameter.\nContains a semicolon-delimited list of mappings from .vcxproj platform names to the platform names use by most types. For example: "*Win32=AnyCPU;X64=X64*"`
        }),
        new AttributeSchema({
            name: "CurrentProjectConfiguration",
            description: `Optional **String** output parameter.\nContains the configuration for the current project.`
        }),
        new AttributeSchema({
            name: "CurrentProjectPlatform",
            description: `Optional **String** output parameter.\nContains the platform for the current project.`
        }),
        new AttributeSchema({
            name: "OnlyReferenceAndBuildProjectsEnabledInSolutionConfiguration",
            description: `Optional **Bool** output parameter.\nContains a flag indicating that references should be built even if they were disabled in the project configuration.`
        }),
        new AttributeSchema({
            name: "ShouldUnsetParentConfigurationAndPlatform",
            description: `Optional **Bool** output parameter.\nContains a flag indicating if the parent configuration and platform should be unset.`
        }),
        new AttributeSchema({
            name: "OutputType",
            description: `Optional **String** output parameter.\nContains the output type for the project.`
        }),
        new AttributeSchema({
            name: "ResolveConfigurationPlatformUsingMappings",
            description: `Optional **Bool** output parameter.\nContains a flag indicating if the build should use the default mappings to resolve the configuration and platform of the passed in project references.`
        }),
        new AttributeSchema({
            name: "AssignedProjects",
            description: `Optional **[ITaskItem](https://msdn.microsoft.com/en-us/library/microsoft.build.framework.itaskitem.aspx)[]** output parameter.\nContains the list of resolved reference paths.`
        }),
        new AttributeSchema({
            name: "UnassignedProjects",
            description: `Optional **[ITaskItem](https://msdn.microsoft.com/en-us/library/microsoft.build.framework.itaskitem.aspx)[]** output parameter.\nContains the list of project reference items that could not be resolved using the pre-resolved list of outputs.`
        })
    ]
});

const assignTargetPathTaskSchema = new TaskSchema({
    name: "AssignTargetPath",
    description: `This task accepts a list files and adds *<TargetPath>* attributes if they are not already specified.`,
    msdn: "https://msdn.microsoft.com/en-us/library/ff601917.aspx",
    attributes: [
        new AttributeSchema({
            name: "RootFolder",
            description: `Optional **String** input parameter.\nContains the path to the folder that contains the target links.`
        }),
        new AttributeSchema({
            name: "Files",
            description: `Optional **[ITaskItem](https://msdn.microsoft.com/en-us/library/microsoft.build.framework.itaskitem.aspx)[]** input parameter.\nContains the incoming list of files.`
        }),
        new AttributeSchema({
            name: "AssignedFiles",
            description: `Optional **[ITaskItem](https://msdn.microsoft.com/en-us/library/microsoft.build.framework.itaskitem.aspx)[]** output parameter.\nContains the resulting list of files.`
        })
    ]
})

const bscMakeTaskSchema = new TaskSchema({
    name: "BscMake",
    description: "Wraps the Microsoft Browse Information Maintenance Utility tool (bscmake.exe). The bscmake.exe tool builds a browse information file (.bsc) from source browser files (.sbr) that are created during compilation. Use the **Object Browser** to view a .bsc file. For more information, see [BSCMAKE Reference](https://msdn.microsoft.com/en-us/library/87x7wc99.aspx).",
    msdn: "https://msdn.microsoft.com/en-us/library/ee862483.aspx",
    attributes: [
        new AttributeSchema({
            name: "AdditionalOptions",
            description: `Optional **String** parameter.\nA list of options as specified on the command line. For example, "*/option1 /option2 /option#*". Use this parameter to specify options that are not represented by any other **BscMake** task parameter.\nFor more information, see the options in [BSCMAKE Options](https://msdn.microsoft.com/en-us/library/cttwt28s.aspx).`
        }),
        new AttributeSchema({
            name: "OutputFile",
            description: `Optional **String** parameter.\nSpecifies a file name that overrides the default output file name.\nFor more information, see the **/o** option in [BSCMAKE Options](https://msdn.microsoft.com/en-us/library/cttwt28s.aspx).`
        }),
        new AttributeSchema({
            name: "PreserveSBR",
            description: `Optional **Boolean** parameter.\nIf *true*, forces a nonincremental build. A full, nonincremental build occurs regardless of whether a .bsc file exists, and prevents .sbr files from being truncated.\nFor more information, see the **/n** option in [BSCMAKE Options](https://msdn.microsoft.com/en-us/library/cttwt28s.aspx).`
        }),
        new AttributeSchema({
            name: "Sources",
            description: `Optional **[ITaskItem](https://msdn.microsoft.com/en-us/library/microsoft.build.framework.itaskitem.aspx)[]** parameter.\nDefines an array of MSBuild source file items that can be consumed and emitted by tasks.`
        }),
        new AttributeSchema({
            name: "SuppressStartupBanner",
            description: `Optional **Boolean** parameter.\nIf *true*, prevents the display of the copyright and version number message when the task starts.\nFor more information, see the **/NOLOGO** option in [BSCMAKE Options](https://msdn.microsoft.com/en-us/library/cttwt28s.aspx).`
        }),
        new AttributeSchema({
            name: "TrackerLogDirectory",
            description: `Optional **String** parameter.\nSpecifies the directory for the tracker log.`
        })
    ]
});

const callTargetTaskSchema = new TaskSchema({
    name: "CallTarget",
    description: `Invokes the specified targets within the project file.\nIf a target specified in *Targets* fails and *RunEachTargetSeparately* is *true*, the task continues to build the remaining targets.\nIf you want to build the default targets, use the [MSBuild Task](https://msdn.microsoft.com/en-us/library/z7f65y0d.aspx) and set the *Projects* parameter equal to *$(MSBuildProjectFile)*.`,
    msdn: "https://msdn.microsoft.com/en-us/library/ms229474.aspx",
    attributes: [
        new AttributeSchema({
            name: "RunEachTargetSeparately",
            description: `Optional **Boolean** output parameter.\nIf *true*, the MSBuild engine is called once per target. If *false*, the MSBuild engine is called once to build all targets. The default value is *false*.`
        }),
        new AttributeSchema({
            name: "TargetOutputs",
            description: `Optional **[ITaskItem](https://msdn.microsoft.com/en-us/library/microsoft.build.framework.itaskitem.aspx)[]** output parameter.\nContains the outputs of all built targets.`
        }),
        new AttributeSchema({
            name: "Targets",
            description: `Optional **String[]** parameter.\nSpecifies the target or targets to build.`
        }),
        new AttributeSchema({
            name: "UseResultsCache",
            description: `Optional **Boolean** parameter.\nIf *true*, the cached result is returned if present.\n **Note:** When an MSBuild task is run, its output is cached in a scope (ProjectFileName, GlobalProperties)[TargetNames] as a list of build items.`
        })
    ]
});

const clTaskSchema = new TaskSchema({
    name: "CL",
    description: `Wraps the Visual C++ compiler tool, cl.exe. The compiler produces executable (.exe) files, dynamic-link library (.dll) files, or code module (.netmodule) files. For more information, see [Compiler Options](https://msdn.microsoft.com/en-us/library/9s7c9wdw.aspx).`,
    msdn: "https://msdn.microsoft.com/en-us/library/ee862477.aspx",
    attributes: [
        new AttributeSchema({
            name: "AdditionalIncludeDirectories",
            description: `Optional **String[]** parameter.\nAdds a directory to the list of directories that are searched for include files.\nFor more information, see [/I (Additional Include Directories)](https://msdn.microsoft.com/en-us/library/73f9s62w.aspx).`
        }),
        new AttributeSchema({
            name: "AdditionalOptions",
            description: `Optional **String** parameter.\nA list of command-line options. For example, "*/option1 /option2 /option#*". Use this parameter to specify command-line options that are not represented by any other task parameter.\nFor more information, see [Compiler Options](https://msdn.microsoft.com/en-us/library/9s7c9wdw.aspx).`
        }),
        new AttributeSchema({
            name: "AdditionalUsingDirectories",
            description: `Optional **String[]** parameter.\nSpecifies a directory that the compiler will search to resolve file references passed to the **#using** directive.\nFor more information, see [/AI (Specify Metadata Directories)](https://msdn.microsoft.com/en-us/library/x1x72k9t.aspx).`
        }),
        new AttributeSchema({
            name: "AlwaysAppend",
            description: `Optional **String** parameter.\nA string that always gets emitted on the command line. Its default value is **"/c"**.`
        }),
        new AttributeSchema({
            name: "AssemblerListingLocation",
            description: `Creates a listing file that contains assembly code.\nFor more information, see the **/Fa** option in [/FA, /Fa (Listing File)](https://msdn.microsoft.com/en-us/library/367y26c6.aspx).`
        }),
        new AttributeSchema({
            name: "AssemblerOutput",
            description: `Optional **String** parameter.\nCreates a listing file that contains assembly code.\nSpecify one of the following values, each of which corresponds to a command-line option.\n+ **NoListing** - <none>\n+ **AssemblyCode** - **/FA**\n+ **AssemblyAndMachineCode** - **/FAc**\n+ **AssemblyAndSourceCode** - **/FAs**\n+ **All** - **/FAcs**\n\nFor more information, see the **/FA**, **/FAc**, **/FAs**, and **/FAcs** options in [/FA, /Fa (Listing File)](https://msdn.microsoft.com/en-us/library/367y26c6.aspx).`
        }),
        new AttributeSchema({
            name: "BasicRuntimeChecks",
            description: `Optional **String** parameter.\nEnables and disables the run-time error checks feature, in conjunction with the [runtime_checks](https://msdn.microsoft.com/en-us/library/6kasb93x.aspx) pragma.\nSpecify one of the following values, each of which corresponds to a command-line option.\n+ **Default** - <none>\n+ **StackFrameRuntimeCheck** - **/RTCs**\n+ **UninitializedLocalUsageCheck** - **/RTCu**\n+ **EnableFastChecks** - **/RTC1**\n\nFor more information, see [/RTC (Run-Time Error Checks)](https://msdn.microsoft.com/en-us/library/8wtf2dfz.aspx).`
        }),
        new AttributeSchema({
            name: "BrowseInformation",
            description: `Optional **Boolean** parameter.\nIf *true*, creates a browse information file.\nFor more information, see the **/FR** option in [/FR, /Fr (Create .Sbr File)](https://msdn.microsoft.com/en-us/library/d5a52hhk.aspx).`
        }),
        new AttributeSchema({
            name: "BrowseInformationFile",
            description: `Optional **String** parameter.\nSpecifies a file name for the browse information file.\nFor more information, see the **BrowseInformation** parameter in this table, and also see [/FR, /Fr (Create .Sbr File)](https://msdn.microsoft.com/en-us/library/d5a52hhk.aspx).`
        }),
        new AttributeSchema({
            name: "BufferSecurityCheck",
            description: `Optional **Boolean** parameter.\nIf *true*, detects some buffer overruns that overwrite the return address, a common technique for exploiting code that does not enforce buffer size restrictions.\nFor more information, see [/GS (Buffer Security Check)](https://msdn.microsoft.com/en-us/library/8dbf701c.aspx).`
        }),
        new AttributeSchema({
            name: "BuildingInIDE",
            description: `Optional **Boolean** parameter.\nIf *true*, indicates that **MSBuild** is invoked by the IDE. Otherwise, **MSBuild** is invoked on the command line.`
        }),
        new AttributeSchema({
            name: "CallingConvention",
            description: `Optional **String** parameter.\nSpecifies the calling convention, which determines the order in which function arguments are pushed onto the stack, whether the caller function or called function removes the arguments from the stack at the end of the call, and the name-decorating convention that the compiler uses to identify individual functions.\nSpecify one of the following values, each of which corresponds to a command-line option.\n+ **Cdecl** - **/Gd**\n+ **FastCall** - **/Gr**\n+ **StdCall** - **/Gz**\n\nFor more information, see [/Gd, /Gr, /Gv, /Gz (Calling Convention)](https://msdn.microsoft.com/en-us/library/46t77ak2.aspx).`
        }),
        new AttributeSchema({
            name: "CompileAs",
            description: `Optional **String** parameter.\nSpecifies whether to compile the input file as a C or C++ source file.\nSpecify one of the following values, each of which corresponds to a command-line option.\n+ **Default** - <none>\n+ **CompileAsC** - **/TC**\n+ **CompileAsCpp** - **/TP**\n\nFor more information, see [/Tc, /Tp, /TC, /TP (Specify Source File Type)](https://msdn.microsoft.com/en-us/library/032xwy55.aspx).`
        }),
        new AttributeSchema({
            name: "CompileAsManaged",
            description: `Optional **String** parameter.\nEnables applications and components to use features from the common language runtime (CLR).\nSpecify one of the following values, each of which corresponds to a command-line option.\n+ **false** - <none>\n+ **true** - **/clr**\n+ **Pure** - **/clr:pure**\n+ **Safe** - **/clr:safe**\n+ **OldSyntax** - **/clr:oldSyntax**\n\nFor more information, see [/clr (Common Language Runtime Compilation)](https://msdn.microsoft.com/en-us/library/k8d11d4s.aspx).`
        }),
        new AttributeSchema({
            name: "CreateHotpatchableImage",
            description: `Optional **Boolean** parameter.\nIf *true*, tells the compiler to prepare an image for *hot patching*. This parameter ensures that the first instruction of each function is two bytes, which is required for hot patching.\nFor more information, see [/hotpatch (Create Hotpatchable Image)](https://msdn.microsoft.com/en-us/library/ms173507.aspx).`
        }),
        new AttributeSchema({
            name: "DebugInformationFormat",
            description: `Optional **String** parameter.\nSelects the type of debugging information created for your program and whether this information is kept in object (.obj) files or in a program database (PDB).\nSpecify one of the following values, each of which corresponds to a command-line option.\n+ **OldStyle** - **/Z7\n+ **ProgramDatabase** - **/Zi**\n+ **EditAndContinue** - **/ZI**\n\nFor more information, see [/Z7, /Zi, /ZI (Debug Information Format)](https://msdn.microsoft.com/en-us/library/958x11bc.aspx).`
        }),
        new AttributeSchema({
            name: "DisableLanguageExtensions",
            description: `Optional **Boolean** parameter.\nIf *true*, tells the compiler to emit an error for language constructs that are not compatible with either ANSI C or ANSI C++.\nFor more information, see the **/Za** option in [/Za, /Ze (Disable Language Extensions)](https://msdn.microsoft.com/en-us/library/0k0w269d.aspx).`
        }),
        new AttributeSchema({
            name: "DisableSpecificWarnings",
            description: `Optional **String[]** parameter.\nDisables the warning numbers that are specified in a semicolon-delimited list.\nFor more information, see the **/wd** option in [/w, /W0, /W1, /W2, /W3, /W4, /w1, /w2, /w3, /w4, /Wall, /wd, /we, /wo, /Wv, /WX (Warning Level)](https://msdn.microsoft.com/en-us/library/thxezb7y.aspx).`
        }),
        new AttributeSchema({
            name: "EnableEnhancedInstructionSet",
            description: `Optional **String** parameter.\nSpecifies the architecture for code generation that uses the Streaming SIMD Extensions (SSE) and Streaming SIMD Extensions 2 (SSE2) instructions.\nSpecify one of the following values, each of which corresponds to a command-line option.\n+ **StreamingSIMDExtensions** - **/arch:SSE**\n+ **StreamingSIMDExtensions2** - **/arch:SSE2**\n\nFor more information, see /arch (x86).`
        }),
        new AttributeSchema({
            name: "EnableFiberSafeOptimizations",
            description: `Optional **Boolean** parameter.\nIf *true*, support fiber safety for data allocated by using static thread-local storage, that is, data allocated by using *__declspec(thread)*.\nFor more information, see [/GT (Support Fiber-Safe Thread-Local Storage)](https://msdn.microsoft.com/en-us/library/6e298fy4.aspx).`
        }),
        new AttributeSchema({
            name: "EnablePREfast",
            description: `Optional **Boolean** parameter.\nIf *true*, enable code analysis.\nFor more information, see [/analyze (Code Analysis)](https://msdn.microsoft.com/en-us/library/ms173498.aspx).`
        }),
        new AttributeSchema({
            name: "ErrorReporting",
            description: `Optional **String** parameter.\nLets you provide internal compiler error (ICE) information directly to Microsoft. By default, the setting in IDE builds is **Prompt** and the setting in command-line builds is **Queue**.\nSpecify one of the following values, each of which corresponds to a command-line option.\n+ **None** - **/errorReport:none**\n+ **Prompt** - **/errorReport:prompt**\n+ **Queue** - **/errorReport:queue**\n+ **Send** - **/errorReport:send**\n\nFor more information, see [/errorReport (Report Internal Compiler Errors)](https://msdn.microsoft.com/en-us/library/ms173502.aspx).`
        }),
        new AttributeSchema({
            name: "ExceptionHandling",
            description: `Optional **String** parameter.\nSpecifies the model of exception handling to be used by the compiler.\nSpecify one of the following values, each of which corresponds to a command-line option.\n+ **false** - <none>\n+ **Async** - **/EHa**\n+ **Sync** - **/EHsc**\n+ **SyncCThrow** - **/EHs**\n\nFor more information, see [/EH (Exception Handling Model)](https://msdn.microsoft.com/en-us/library/1deeycx5.aspx).`
        }),
        new AttributeSchema({
            name: "ExpandAttributedSource",
            description: `Optional **Boolean** parameter.\nIf *true*, creates a listing file that has expanded attributes injected into the source file.\nFor more information, see [/Fx (Merge Injected Code)](https://msdn.microsoft.com/en-us/library/d8ex062w.aspx).`
        }),
        new AttributeSchema({
            name: "FavorSizeOrSpeed",
            description: `Optional **String** parameter.\nSpecifies whether to favor code size or code speed.\nSpecify one of the following values, each of which corresponds to a command-line option.\n+ **Neither** - <none>\n+ **Size** - **/Os**\n+ **Speed** - **/Ot**\n\nFor more information, see [/Os, /Ot (Favor Small Code, Favor Fast Code)](https://msdn.microsoft.com/en-us/library/f9534wye.aspx).`
        }),
        new AttributeSchema({
            name: "FloatingPointExceptions",
            description: `Optional **Boolean** parameter.\nIf *true*, enables the reliable floating-point exception model. Exceptions will be raised immediately after they are triggered.\nFor more information, see the **/fp:except** option in [/fp (Specify Floating-Point Behavior)](https://msdn.microsoft.com/en-us/library/e7s85ffb.aspx).`
        }),
        new AttributeSchema({
            name: "FloatingPointModel",
            description: `Optional **String** parameter.\nSets the floating point model.\nSpecify one of the following values, each of which corresponds to a command-line option.\n+ **Precise** - **/fp:precise**\n+ **Strict** - **/fp:strict**\n+ **Fast** - **/fp:fast**\n\nFor more information, see [/fp (Specify Floating-Point Behavior)](https://msdn.microsoft.com/en-us/library/e7s85ffb.aspx).`
        }),
        new AttributeSchema({
            name: "ForceConformanceInForLoopScope",
            description: `Optional **Boolean** parameter.\nIf *true*, implements standard C++ behavior in [for](https://msdn.microsoft.com/en-us/library/b80153d8.aspx) loops that use Microsoft extensions ([/Ze](https://msdn.microsoft.com/en-us/library/0k0w269d.aspx)).\nFor more information, see [/Zc:forScope (Force Conformance in for Loop Scope)](https://msdn.microsoft.com/en-us/library/84wcsx8x.aspx).`
        }),
        new AttributeSchema({
            name: "ForcedIncludeFiles",
            description: `Optional **String[]** parameter.\nCauses the preprocessor to process one or more specified header files.\nFor more information, see [/FI (Name Forced Include File)](https://msdn.microsoft.com/en-us/library/8c5ztk84.aspx).`
        }),
        new AttributeSchema({
            name: "ForcedUsingFiles",
            description: `Optional **String[]** parameter.\nCauses the preprocessor to process one or more specified **#using** files.\nFor more information, see [/FU (Name Forced #using File)](https://msdn.microsoft.com/en-us/library/81ex1b0a.aspx).`
        }),
        new AttributeSchema({
            name: "FunctionLevelLinking",
            description: `Optional **Boolean** parameter.\nIf *true*, enables the compiler to package individual functions in the form of packaged functions (COMDATs).\nFor more information, see [/Gy (Enable Function-Level Linking)](https://msdn.microsoft.com/en-us/library/xsa71f43.aspx).`
        }),
        new AttributeSchema({
            name: "GenerateXMLDocumentationFiles",
            description: `Optional **Boolean** parameter.\nIf *true*, causes the compiler to process documentation comments in source code files and to create an .xdc file for each source code file that has documentation comments.\nFor more information, see [/doc (Process Documentation Comments) (C/C++)](https://msdn.microsoft.com/en-us/library/ms173501.aspx). Also see the **XMLDocumentationFileName** parameter.`
        }),
        new AttributeSchema({
            name: "IgnoreStandardIncludePath",
            description: `Optional **Boolean** parameter.\nIf *true*, prevents the compiler from searching for include files in directories specified in the PATH and INCLUDE environment variables.\nFor more information, see [/X (Ignore Standard Include Paths)](https://msdn.microsoft.com/en-us/library/93t31bx4.aspx).`
        }),
        new AttributeSchema({
            name: "InlineFunctionExpansion",
            description: `Optional **String** parameter.\nSpecifies the level of inline function expansion for the build.\nSpecify one of the following values, each of which corresponds to a command-line option.\n+ **Default** - <none>\n+ **Disabled** - **/Ob0**\n+ **OnlyExplicitInline** - **/Ob1**\n+ **AnySuitable** - **/Ob2**\n\nFor more information, see [/Ob (Inline Function Expansion)](https://msdn.microsoft.com/en-us/library/47238hez.aspx).`
        }),
        new AttributeSchema({
            name: "IntrinsicFunctions",
            description: `Optional **Boolean** parameter.\nIf *true*, replaces some function calls with intrinsic or otherwise special forms of the function that help your application run faster.\nFor more information, see [/Oi (Generate Intrinsic Functions)](https://msdn.microsoft.com/en-us/library/f99tchzc.aspx).`
        }),
        new AttributeSchema({
            name: "MinimalRebuild",
            description: `Optional **Boolean** parameter.\nIf *true*, enables minimal rebuild, which determines whether C++ source files that include changed C++ class definitions (stored in header (.h) files) must be recompiled.\nFor more information, see [/Gm (Enable Minimal Rebuild)](https://msdn.microsoft.com/en-us/library/kfz8ad09.aspx).`
        }),
        new AttributeSchema({
            name: "MultiProcessorCompilation",
            description: `Optional **Boolean** parameter.\nIf *true*, use multiple processors to compile. This parameter creates a process for each effective processor on your computer.\nFor more information, see [/MP (Build with Multiple Processes)](https://msdn.microsoft.com/en-us/library/bb385193.aspx). Also, see the **ProcessorNumber** parameter.`
        }),
        new AttributeSchema({
            name: "ObjectFileName",
            description: `Optional **String** parameter.\nSpecifies an object (.obj) file name or directory to be used instead of the default.\nFor more information, see [/Fo (Object File Name)](https://msdn.microsoft.com/en-us/library/yb8e9b8y.aspx).`
        }),
        new AttributeSchema({
            name: "ObjectFiles",
            description: `Optional **String[]** parameter.\nA list of object files.`
        }),
        new AttributeSchema({
            name: "OmitDefaultLibName",
            description: `Optional **Boolean** parameter.\nIf *true*, omits the default C run-time library name from the object (.obj) file. By default, the compiler puts the name of the library into the .obj file to direct the linker to the correct library.\nFor more information, see [/Zl (Omit Default Library Name)](https://msdn.microsoft.com/en-us/library/f1tbxcxh.aspx).`
        }),
        new AttributeSchema({
            name: "OmitFramePointers",
            description: `Optional **Boolean** parameter.\nIf *true*, suppresses creation of frame pointers on the call stack.\nFor more information, see [/Oy (Frame-Pointer Omission)](https://msdn.microsoft.com/en-us/library/2kxx5t2c.aspx).`
        }),
        new AttributeSchema({
            name: "OpenMPSupport",
            description: `Optional **Boolean** parameter.\nIf *true*, causes the compiler to process OpenMP clauses and directives.\nFor more information, see [/openmp (Enable OpenMP 2.0 Support)](https://msdn.microsoft.com/en-us/library/fw509c3b.aspx).`
        }),
        new AttributeSchema({
            name: "Optimization",
            description: `Optional **String** parameter.\nSpecifies various code optimizations for speed and size.\nSpecify one of the following values, each of which corresponds to a command-line option.\n+ **Disabled** - **/Od**\n+ **MinSpace** - **/O1**\n+ **MaxSpeed** - **/O2**\n+ **Full** - **/Ox**\n\nFor more information, see [/O Options (Optimize Code)](https://msdn.microsoft.com/en-us/library/k1ack8f1.aspx).`
        }),
        new AttributeSchema({
            name: "PrecompiledHeader",
            description: `Optional **String** parameter.\nCreate or use a precompiled header (.pch) file during the build.\nSpecify one of the following values, each of which corresponds to a command-line option.\n+ **NotUsing** - <none>\n+ **Create** - **/Yc**\n+ **Use** - **/Yu**\n\nFor more information, see [/Yc (Create Precompiled Header File)](https://msdn.microsoft.com/en-us/library/7zc28563.aspx) and [/Yu (Use Precompiled Header File)](https://msdn.microsoft.com/en-us/library/z0atkd6c.aspx). Also, see the **PrecompiledHeaderFile** and **PrecompiledHeaderOutputFile** parameters.`
        }),
        new AttributeSchema({
            name: "PrecompiledHeaderFile",
            description: `Optional **String** parameter.\nSpecifies a precompiled header file name to create or use.\nFor more information, see [/Yc (Create Precompiled Header File)](https://msdn.microsoft.com/en-us/library/7zc28563.aspx) and [/Yu (Use Precompiled Header File)](https://msdn.microsoft.com/en-us/library/z0atkd6c.aspx).`
        }),
        new AttributeSchema({
            name: "PrecompiledHeaderOutputFile",
            description: `Optional **String** parameter.\nSpecifies a path name for a precompiled header instead of using the default path name.\nFor more information, see [/Fp (Name .Pch File)](https://msdn.microsoft.com/en-us/library/8f7a897x.aspx).`
        }),
        new AttributeSchema({
            name: "PreprocessKeepComments",
            description: `Optional **Boolean** parameter.\nIf *true*, preserves comments during preprocessing.\nFor more information, see [/C (Preserve Comments During Preprocessing)](https://msdn.microsoft.com/en-us/library/32165865.aspx).`
        }),
        new AttributeSchema({
            name: "PreprocessorDefinitions",
            description: `Optional **String[]** parameter.\nDefines a preprocessing symbol for your source file.\nFor more information, see [/D (Preprocessor Definitions)](https://msdn.microsoft.com/en-us/library/hhzbb5c8.aspx).`
        }),
        new AttributeSchema({
            name: "PreprocessOutput",
            description: `Optional **[ITaskItem](https://msdn.microsoft.com/en-us/library/microsoft.build.framework.itaskitem.aspx)[]** parameter.\nDefines an array of preprocessor output items that can be consumed and emitted by tasks.`
        }),
        new AttributeSchema({
            name: "PreprocessOutputPath",
            description: `Optional **String** parameter.\nSpecifies the name of the output file to which the **PreprocessToFile** parameter writes preprocessed output.\nFor more information, see [/Fi (Preprocess Output File Name)](https://msdn.microsoft.com/en-us/library/ee207218.aspx).`
        }),
        new AttributeSchema({
            name: "PreprocessSuppressLineNumbers",
            description: `Optional **Boolean** parameter.\nIf *true*, preprocesses C and C++ source files and copies the preprocessed files to the standard output device.\nFor more information, see [/EP (Preprocess to stdout Without #line Directives)](https://msdn.microsoft.com/en-us/library/becb7sys.aspx).`
        }),
        new AttributeSchema({
            name: "PreprocessToFile",
            description: `Optional **Boolean** parameter.\nIf *true*, preprocesses C and C++ source files and writes the preprocessed output to a file.\nFor more information, see [/P (Preprocess to a File)](https://msdn.microsoft.com/en-us/library/8z9z0bx6.aspx).`
        }),
        new AttributeSchema({
            name: "ProcessorNumber",
            description: `Optional **Integer** parameter.\nSpecifies the maximum number of processors to use in a multiprocessor compilation. Use this parameter in combination with the **MultiProcessorCompilation** parameter.`
        }),
        new AttributeSchema({
            name: "ProgramDataBaseFileName",
            description: `Optional **String** parameter.\nSpecifies a file name for the program database (PDB) file.\nFor more information, see [/Fd (Program Database File Name)](https://msdn.microsoft.com/en-us/library/9wst99a9.aspx).`
        }),
        new AttributeSchema({
            name: "RuntimeLibrary",
            description: `Optional **String** parameter.\nIndicates whether a multithreaded module is a DLL, and selects retail or debug versions of the run-time library.\nSpecify one of the following values, each of which corresponds to a command-line option.\n+ **MultiThreaded** - **/MT**\n+ **MultiThreadedDebug** - **/MTd**\n+ **MultiThreadedDLL** - **/MD**\n+ **MultiThreadedDebugDLL** - **/MDd**\n\nFor more information, see [/MD, /MT, /LD (Use Run-Time Library)](https://msdn.microsoft.com/en-us/library/2kzt1wy3.aspx).`
        }),
        new AttributeSchema({
            name: "RuntimeTypeInfo",
            description: `Optional **Boolean** parameter.\nIf *true*, adds code to check C++ object types at run time (run-time type information).\nFor more information, see [/GR (Enable Run-Time Type Information)](https://msdn.microsoft.com/en-us/library/we6hfdy0.aspx).`
        }),
        new AttributeSchema({
            name: "ShowIncludes",
            description: `Optional **Boolean** parameter.\nIf *true*, causes the compiler to output a list of the include files.\nFor more information, see [/showIncludes (List Include Files)](https://msdn.microsoft.com/en-us/library/hdkef6tk.aspx).`
        }),
        new AttributeSchema({
            name: "SmallerTypeCheck",
            description: `Optional **Boolean** parameter.\nIf *true*, reports a run-time error if a value is assigned to a smaller data type and causes a data loss.\nFor more information, see the **/RTCc** option in [/RTC (Run-Time Error Checks)](https://msdn.microsoft.com/en-us/library/8wtf2dfz.aspx).`
        }),
        new AttributeSchema({
            name: "Sources",
            description: `Required **[ITaskItem](https://msdn.microsoft.com/en-us/library/microsoft.build.framework.itaskitem.aspx)[]** parameter.\nSpecifies a list of source files separated by spaces.`,
            required: true
        }),
        new AttributeSchema({
            name: "StringPooling",
            description: `Optional **Boolean** parameter.\nIf *true*, enables the compiler to create one copy of identical strings in the program image.\nFor more information, see [/GF (Eliminate Duplicate Strings)](https://msdn.microsoft.com/en-us/library/s0s0asdt.aspx).`
        }),
        new AttributeSchema({
            name: "StructMemberAlignment",
            description: `Optional **String** parameter.\nSpecifies the byte alignment for all members in a structure.\nSpecify one of the following values, each of which corresponds to a command-line option.\n+ **Default** - **/Zp1**\n+ **1Byte** - **/Zp1**\n+ **2Bytes** - **/Zp2**\n+ **4Bytes** - **/Zp4**\n+ **8Bytes** - **/Zp8**\n+ **16Bytes** - **/Zp16**\n\nFor more information, see [/Zp (Struct Member Alignment)](https://msdn.microsoft.com/en-us/library/xh3e3fd0.aspx).`
        }),
        new AttributeSchema({
            name: "SuppressStartupBanner",
            description: `Optional **Boolean** parameter.\nIf *true*, prevents the display of the copyright and version number message when the task starts.\nFor more information, see [/nologo (Suppress Startup Banner) (C/C++)](https://msdn.microsoft.com/en-us/library/9k1xyh7d.aspx).`
        }),
        new AttributeSchema({
            name: "TrackerLogDirectory",
            description: `Optional **String** parameter.\nSpecifies the intermediate directory where tracking logs for this task are stored.\nFor more information, see the **TLogReadFiles** and **TLogWriteFiles** parameters in this table.`
        }),
        new AttributeSchema({
            name: "TreatSpecificWarningsAsErrors",
            description: `Optional **String[]** parameter.\nTreats the specified list of compiler warnings as errors.\nFor more information, see the **/we**n option in [/w, /W0, /W1, /W2, /W3, /W4, /w1, /w2, /w3, /w4, /Wall, /wd, /we, /wo, /Wv, /WX (Warning Level)](https://msdn.microsoft.com/en-us/library/thxezb7y.aspx).`
        }),
        new AttributeSchema({
            name: "TreatWarningAsError",
            description: `Optional **Boolean** parameter.\nIf *true*, treat all compiler warnings as errors.\nFor more information, see **/WX** option in [/w, /W0, /W1, /W2, /W3, /W4, /w1, /w2, /w3, /w4, /Wall, /wd, /we, /wo, /Wv, /WX (Warning Level)](https://msdn.microsoft.com/en-us/library/thxezb7y.aspx).`
        }),
        new AttributeSchema({
            name: "TreatWChar_tAsBuiltInType",
            description: `Optional **Boolean** parameter.\nIf *true*, treat the *wchar_t* type as a native type.\nFor more information, see [/Zc:wchar_t (wchar_t Is Native Type)](https://msdn.microsoft.com/en-us/library/dh8che7s.aspx).`
        }),
        new AttributeSchema({
            name: "UndefineAllPreprocessorDefinitions",
            description: `Optional **Boolean** parameter.\nIf *true*, undefines the Microsoft-specific symbols that the compiler defines.\nFor more information, see the **/u** option in [/U, /u (Undefine Symbols)](https://msdn.microsoft.com/en-us/library/c3h46dfd.aspx).`
        }),
        new AttributeSchema({
            name: "UndefinePreprocessorDefinitions",
            description: `Optional **String[]** parameter.\nSpecifies a list of one or more preprocessor symbols to undefine.\nFor more information, see **/U** option in [/U, /u (Undefine Symbols)](https://msdn.microsoft.com/en-us/library/c3h46dfd.aspx).`
        }),
        new AttributeSchema({
            name: "UseFullPaths",
            description: `Optional **Boolean** parameter.\nIf *true*, displays the full path of source code files passed to the compiler in diagnostics.\nFor more information, see [/FC (Full Path of Source Code File in Diagnostics)](https://msdn.microsoft.com/en-us/library/027c4t2s.aspx).`
        }),
        new AttributeSchema({
            name: "UseUnicodeForAssemblerListing",
            description: `Optional **Boolean** parameter.\nIf *true*, causes the output file to be created in UTF-8 format.\nFor more information, see the **/FAu** option in [/FA, /Fa (Listing File)](https://msdn.microsoft.com/en-us/library/367y26c6.aspx).`
        }),
        new AttributeSchema({
            name: "WarningLevel",
            description: `Optional **String** parameter.\nSpecifies the highest level of warning that is to be generated by the compiler.\nSpecify one of the following values, each of which corresponds to a command-line option.\n+ **TurnOffAllWarnings** - **/W0**\n+ **Level1** - **/W1**\n+ **Level2** - **/W2**\n+ **Level3** - **/W3**\n+ **Level4** - **/W4**\n+ **EnableAllWarnings** - **/Wall**\n\nFor more information, see the **/W**n option in [/w, /W0, /W1, /W2, /W3, /W4, /w1, /w2, /w3, /w4, /Wall, /wd, /we, /wo, /Wv, /WX (Warning Level)](https://msdn.microsoft.com/en-us/library/thxezb7y.aspx).`
        }),
        new AttributeSchema({
            name: "WholeProgramOptimization",
            description: `Optional **Boolean** parameter.\nIf *true*, enables whole program optimization.\nFor more information, see [/GL (Whole Program Optimization)](https://msdn.microsoft.com/en-us/library/0zza0de8.aspx).`
        }),
        new AttributeSchema({
            name: "XMLDocumentationFileName",
            description: `Optional **String** parameter.\nSpecifies the name of the generated XML documentation files. This parameter can be a file or directory name.\nFor more information, see the name argument in [/doc (Process Documentation Comments) (C/C++)](https://msdn.microsoft.com/en-us/library/ms173501.aspx). Also see the **GenerateXMLDocumentationFiles** parameter.`
        }),
        new AttributeSchema({
            name: "MinimalRebuildFromTracking",
            description: `Optional **Boolean** parameter.\nIf *true*, a tracked incremental build is performed; if *false*, a rebuild is performed.`
        }),
        new AttributeSchema({
            name: "TLogReadFiles",
            description: `Optional **[ITaskItem](https://msdn.microsoft.com/en-us/library/microsoft.build.framework.itaskitem.aspx)[]** parameter.\nSpecifies an array of items that represent the *read file tracking logs*.\nA read-file tracking log (.tlog) contains the names of the input files that are read by a task, and is used by the project build system to support incremental builds. For more information, see the **TrackerLogDirectory** and **TrackFileAccess** parameters.`
        }),
        new AttributeSchema({
            name: "TLogWriteFiles",
            description: `Optional **[ITaskItem](https://msdn.microsoft.com/en-us/library/microsoft.build.framework.itaskitem.aspx)[]** parameter.\nSpecifies an array of items that represent the *write file tracking logs*.\nA write-file tracking log (.tlog) contains the names of the output files that are written by a task, and is used by the project build system to support incremental builds. For more information, see the **TrackerLogDirectory** and **TrackFileAccess** parameters.`
        }),
        new AttributeSchema({
            name: "TrackFileAccess",
            description: `Optional **Boolean** parameter.\nIf *true*, tracks file access patterns.\nFor more information, see the **TLogReadFiles** and **TLogWriteFiles** parameters.`
        })
    ]
});

const combinePathTaskSchema = new TaskSchema({
    name: "CombinePath",
    description: `Combines the specified paths into a single path.`,
    msdn: "https://msdn.microsoft.com/en-us/library/bb763042.aspx",
    attributes: [
        new AttributeSchema({
            name: "BasePath",
            description: `Required **String** parameter.\nThe base path to combine with the other paths. Can be a relative path, absolute path, or blank.`,
            required: true
        }),
        new AttributeSchema({
            name: "Paths",
            description: `Required **[ITaskItem](https://msdn.microsoft.com/en-us/library/microsoft.build.framework.itaskitem.aspx)[]** parameter.\nA list of individual paths to combine with the BasePath to form the combined path. Paths can be relative or absolute.`,
            required: true
        }),
        new AttributeSchema({
            name: "CombinedPaths",
            description: `Optional **[ITaskItem](https://msdn.microsoft.com/en-us/library/microsoft.build.framework.itaskitem.aspx)[]** output parameter.\nThe combined path that is created by this task.`
        })
    ]
});

const convertToAbsolutePathTaskSchema = new TaskSchema({
    name: "ConvertToAbsolutePath",
    description: ``,
    msdn: "https://msdn.microsoft.com/en-us/library/bb882668.aspx",
    attributes: [
        new AttributeSchema({
            name: "Paths",
            description: `Required **[ITaskItem](https://msdn.microsoft.com/en-us/library/microsoft.build.framework.itaskitem.aspx)[]** parameter.\nThe list of relative paths to convert to absolute paths.`,
            required: true
        }),
        new AttributeSchema({
            name: "AbsolutePaths",
            description: `Optional **[ITaskItem](https://msdn.microsoft.com/en-us/library/microsoft.build.framework.itaskitem.aspx)[]** output parameter.\nThe list of absolute paths for the items that were passed in.`
        })
    ]
})

const copyTaskSchema = new TaskSchema({
    name: "Copy",
    description: "Copies files to a new location in the file system.",
    msdn: "https://msdn.microsoft.com/en-us/library/3e54c37h.aspx",
    attributes: [
        new AttributeSchema({
            name: "CopiedFiles",
            description: `Optional **[ITaskItem](https://msdn.microsoft.com/en-us/library/microsoft.build.framework.itaskitem.aspx)[]** output parameter.\nContains the items that were successfully copied.`
        }),
        new AttributeSchema({
            name: "DestinationFiles",
            description: `Optional **[ITaskItem](https://msdn.microsoft.com/en-us/library/microsoft.build.framework.itaskitem.aspx)[]** parameter.\nSpecifies the list of files to copy the source files to. This list is expected to be a one-to-one mapping with the list specified in the *SourceFiles* parameter. That is, the first file specified in *SourceFiles* will be copied to the first location specified in *DestinationFiles*, and so forth.`,
            required: true,
            notWith: "DestinationFolder"
        }),
        new AttributeSchema({
            name: "DestinationFolder",
            description: `Optional **[ITaskItem](https://msdn.microsoft.com/en-us/library/microsoft.build.framework.itaskitem.aspx)** parameter.\nSpecifies the directory to which you want to copy the files. This must be a directory, not a file. If the directory does not exist, it is created automatically.`,
            required: true,
            notWith: "DestinationFiles"
        }),
        new AttributeSchema({
            name: "OverwriteReadOnlyFiles",
            description: `Optional **Boolean** parameter.\nOverwrite files even if they are marked as read only files`
        }),
        new AttributeSchema({
            name: "Retries",
            description: `Optional **Int32** parameter.\nSpecifies how many times to attempt to copy, if all previous attempts have failed. Defaults to zero. **Note:** The use of retries can mask a synchronization problem in your build process.`
        }),
        new AttributeSchema({
            name: "RetryDelayMilliseconds",
            description: `Optional **Int32** parameter.\nSpecifies the delay between any necessary retries. Defaults to the RetryDelayMillisecondsDefault argument, which is passed to the CopyTask constructor.`
        }),
        new AttributeSchema({
            name: "SkipUnchangedFiles",
            description: `Optional **Boolean** parameter.\nIf *true*, skips the copying of files that are unchanged between the source and destination. The *Copy* task considers files to be unchanged if they have the same size and the same last modified time. **Note:** If you set this parameter to *true*, you should not use dependency analysis on the containing target, because that only runs the task if the last-modified times of the source files are newer than the last-modified times of the destination files.`
        }),
        new AttributeSchema({
            name: "SourceFiles",
            description: `Required **[ITaskItem](https://msdn.microsoft.com/en-us/library/microsoft.build.framework.itaskitem.aspx)[]** parameter.\nSpecifies the files to copy.`,
            required: true
        }),
        new AttributeSchema({
            name: "UseHardlinksIfPossible",
            description: `Optional **Boolean** parameter.\nIf *true*, creates Hard Links for the copied files instead of copying the files.`
        })
    ]
});

const cppCleanTaskSchema = new TaskSchema({
    name: "CPPClean",
    description: `Deletes the temporary files that MSBuild creates when a Visual C++ project is built. The process of deleting build files is known as *cleaning*.`,
    msdn: "https://msdn.microsoft.com/en-us/library/ee862481.aspx",
    attributes: [
        new AttributeSchema({
            name: "DeletedFiles",
            description: `Optional **[ITaskItem](https://msdn.microsoft.com/en-us/library/microsoft.build.framework.itaskitem.aspx)[]** output parameter.\nDefines an array of MSBuild output file items that can be consumed and emitted by tasks.`
        }),
        new AttributeSchema({
            name: "DoDelete",
            description: `Optional **Boolean** parameter.\nIf *true*, clean temporary build files.`
        }),
        new AttributeSchema({
            name: "FilePatternsToDeleteOnClean",
            description: `Required **String** parameter.\nSpecifies a semicolon-delimited list of file extensions of files to clean.`,
            required: true
        }),
        new AttributeSchema({
            name: "FilesExcludedFromClean",
            description: `Optional **String** parameter.\nSpecifies a semicolon-delimited list of files not to clean.`
        }),
        new AttributeSchema({
            name: "FoldersToClean",
            description: `Required **String** parameter.\nSpecifies a semicolon-delimited list of directories to clean. You can specify a full or a relative path, and the path can contain the wildcard symbol (*).`,
            required: true
        })
    ]
});

const createCSharpManifestResourceNameTaskSchema = new TaskSchema({
    name: "CreateCSharpManifestResourceName",
    description: `Creates a Visual C#-style manifest name from a given .resx file name or other resource.`,
    msdn: "https://msdn.microsoft.com/en-us/library/bb762925.aspx",
    attributes: [
        new AttributeSchema({
            name: "ManifestResourceNames",
            description: `**[ITaskItem](https://msdn.microsoft.com/en-us/library/microsoft.build.framework.itaskitem.aspx)[]** output read-only parameter.\nThe resulting manifest names.`
        }),
        new AttributeSchema({
            name: "ResourceFiles",
            description: `Required **String** parameter.\nThe name of the resource file from which to create the Visual C# manifest name.`,
            required: true
        }),
        new AttributeSchema({
            name: "RootNamespace",
            description: `Optional **String** parameter.\nThe root namespace of the resource file, typically taken from the project file. May be *null*.`
        }),
        new AttributeSchema({
            name: "PrependCultureAsDirectory",
            description: `Optional **Boolean** parameter.\nIf *true*, the culture name is added as a directory name just before the manifest resource name. Default value is *true*.`
        }),
        new AttributeSchema({
            name: "ResourceFilesWithManifestResourceNames",
            description: `Optional read-only **String** output parameter.\nReturns the name of the resource file that now includes the manifest resource name.`
        })
    ]
});

const createItemTaskSchema = new TaskSchema({
    name: "CreateItem",
    description: `Populates item collections with the input items. This allows items to be copied from one list to another.\n**Note:** This task is deprecated. Starting with .NET Framework 3.5, item groups may be placed within [Target](https://msdn.microsoft.com/en-us/library/t50z2hka.aspx) elements. For more information, see [Items](https://msdn.microsoft.com/en-us/library/ms171453.aspx).`,
    msdn: "https://msdn.microsoft.com/en-us/library/s2y3e43x.aspx",
    attributes: [
        new AttributeSchema({
            name: "AdditionalMetadata",
            description: `Optional **String[]** parameter.\nSpecifies additional metadata to attach to the output items. Specify the metadata name and value for the item with the following syntax:\n*MetadataName = MetadataValue*\nMultiple metadata name/value pairs should be separated with a semicolon. If either the name or the value contains a semicolon or any other special characters, they must be escaped. For more information, see [How to: Escape Special Characters in MSBuild](https://msdn.microsoft.com/en-us/library/ms228186.aspx).`
        }),
        new AttributeSchema({
            name: "Exclude",
            description: `Optional **[ITaskItem](https://msdn.microsoft.com/en-us/library/microsoft.build.framework.itaskitem.aspx)[]** output parameter.\nSpecifies the items to exclude from the output item collection. This parameter can contain wildcard specifications. For more information, see [Items](https://msdn.microsoft.com/en-us/library/ms171453.aspx) and [How to: Exclude Files from the Build](https://msdn.microsoft.com/en-us/library/ms171455.aspx).`
        }),
        new AttributeSchema({
            name: 'Include',
            description: `Required **[ITaskItem](https://msdn.microsoft.com/en-us/library/microsoft.build.framework.itaskitem.aspx)[]** parameter.\nSpecifies the items to include in the output item collection. This parameter can contain wildcard specifications.`,
            required: true
        }),
        new AttributeSchema({
            name: "PreserveExistingMetadata",
            description: `Optional **Boolean** parameter.\nIf *true*, only apply the additional metadata if they do not already exist.`
        })
    ]
});

const createPropertyTaskSchema = new TaskSchema({
    name: "CreateProperty",
    description: `Populates properties with the values passed in. This allows values to be copied from one property or string to another.`,
    msdn: "https://msdn.microsoft.com/en-us/library/63ckb9s9.aspx",
    attributes: [
        new AttributeSchema({
            name: "Value",
            description: `Optional **String** output parameter.\nSpecifies the value to copy to the new property.`
        }),
        new AttributeSchema({
            name: "ValueSetByTask",
            description: `Optional **String** output parameter.\nContains the same value as the *Value* parameter. Use this parameter only when you want to avoid having the output property set by MSBuild when it skips the enclosing target because the outputs are up-to-date.`
        })
    ]
});

const createVisualBasicManifestResourceNameTaskSchema = new TaskSchema({
    name: "CreateVisualBasicManifestResourceName",
    description: `Creates a Visual Basic-style manifest name from a given .resx file name or other resource.`,
    msdn: "https://msdn.microsoft.com/en-us/library/bb762915.aspx",
    attributes: [
        new AttributeSchema({
            name: "ManifestResourceNames",
            description: `**[ITaskItem](https://msdn.microsoft.com/en-us/library/microsoft.build.framework.itaskitem.aspx)[]** output read-only parameter.\nThe resulting manifest names.`
        }),
        new AttributeSchema({
            name: "ResourceFiles",
            description: `Required **String** parameter.\nThe name of the resource file from which to create the Visual Basic manifest name.`,
            required: true
        }),
        new AttributeSchema({
            name: "RootNamespace",
            description: `Optional **String** parameter.\nThe root namespace of the resource file, typically taken from the project file. May be *null*.`
        }),
        new AttributeSchema({
            name: "PrependCultureAsDirectory",
            description: `Optional **Boolean** parameter.\nIf *true*, the culture name is added as a directory name just before the manifest resource name. Default value is *true*.`
        }),
        new AttributeSchema({
            name: "ResourceFilesWithManifestResourceNames",
            description: `Optional read-only **String** output parameter.\nReturns the name of the resource file that now includes the manifest resource name.`
        })
    ]
});

const cscTaskSchema = new TaskSchema({
    name: "Csc",
    description: `Wraps CSC.exe, and produces executables (.exe files), dynamic-link libraries (.dll files), or code modules (.netmodule files). For more information about CSC.exe, see [C# Compiler Options](https://msdn.microsoft.com/en-us/library/2fdbz5xd.aspx).`,
    msdn: "https://msdn.microsoft.com/en-us/library/s5c8athz.aspx",
    attributes: [
        new AttributeSchema({
            name: "AdditionalLibPaths",
            description: `Optional **String[]** parameter.\nSpecifies additional directories to search for references. For more information, see [/lib (C# Compiler Options)](https://msdn.microsoft.com/en-us/library/s5bac5fx.aspx).`
        }),
        new AttributeSchema({
            name: "AddModules",
            description: `Optional **String** parameter.\nSpecifies one or more modules to be part of the assembly. For more information, see [/addmodule (C# Compiler Options)](https://msdn.microsoft.com/en-us/library/1s46f83c.aspx).`
        }),
        new AttributeSchema({
            name: "AllowUnsafeBlocks",
            description: `Optional **Boolean** parameter.\nIf *true*, compiles code that uses the [unsafe](https://msdn.microsoft.com/en-us/library/chfa2zb8.aspx) keyword. For more information, see [/unsafe (C# Compiler Options)](https://msdn.microsoft.com/en-us/library/ct597kb0.aspx).`
        }),
        new AttributeSchema({
            name: "ApplicationConfiguration",
            description: `Optional **String** parameter.\nSpecifies the application configuration file containing the assembly binding settings.`
        }),
        new AttributeSchema({
            name: "BaseAddress",
            description: `Optional **String** parameter.\nSpecifies the preferred base address at which to load a DLL. The default base address for a DLL is set by the .NET Framework common language runtime. For more information, see [/baseaddress (C# Compiler Options)](https://msdn.microsoft.com/en-us/library/b1awdekb.aspx).`
        }),
        new AttributeSchema({
            name: "CheckForOverflowUnderflow",
            description: `Optional **Boolean** parameter.\nSpecifies whether integer arithmetic that overflows the bounds of the data type causes an exception at run time. For more information, see [/checked (C# Compiler Options)](https://msdn.microsoft.com/en-us/library/h25wtyxf.aspx).`
        }),
        new AttributeSchema({
            name: "CodePage",
            description: `Optional **Int32** parameter.\nSpecifies the code page to use for all source code files in the compilation. For more information, see [/codepage (C# Compiler Options)](https://msdn.microsoft.com/en-us/library/w0kyekyh.aspx).`
        }),
        new AttributeSchema({
            name: "DebugType",
            description: `Optional **String** parameter.\nSpecifies the debug type. *DebugType* can be *full* or *pdbonly*. The default is *full*, which enables a debugger to be attached to a running program. Specifying pdbonly enables source code debugging when the program is started in the debugger, but only displays assembler when the running program is attached to the debugger.\nThis parameter overrides the *EmitDebugInformation* parameter.\nFor more information, see [/debug (C# Compiler Options)](https://msdn.microsoft.com/en-us/library/8cw0bt21.aspx).`
        }),
        new AttributeSchema({
            name: "DefineConstants",
            description: `Optional **String** parameter.\nDefines preprocessor symbols. For more information, see [/define (C# Compiler Options)](https://msdn.microsoft.com/en-us/library/0feaad6z.aspx).`
        }),
        new AttributeSchema({
            name: "DelaySign",
            description: `Optional **Boolean** parameter.\nIf *true*, specifies that you want a fully signed assembly. If *false*, specifies that you only want to place the public key in the assembly.\nThis parameter has no effect unless used with either the *KeyFile* or *KeyContainer* parameter.\nFor more information, see [/delaysign (C# Compiler Options)](https://msdn.microsoft.com/en-us/library/ta1sxwy8.aspx).`
        }),
        new AttributeSchema({
            name: "DisabledWarnings",
            description: `Optional **String** parameter.\nSpecifies the list of warnings to be disabled. For more information, see [/nowarn (C# Compiler Options)](https://msdn.microsoft.com/en-us/library/7f28x9z3.aspx).`
        }),
        new AttributeSchema({
            name: "DocumentationFile",
            description: `Optional **String** parameter.\nProcesses documentation comments to an XML file. For more information, see [/doc (C# Compiler Options)](https://msdn.microsoft.com/en-us/library/3260k4x7.aspx).`
        }),
        new AttributeSchema({
            name: "EmitDebugInformation",
            description: `Optional **Boolean** parameter.\nIf *true*, the task generates debugging information and places it in a program database (.pdb) file. If *false*, the task emits no debug information. Default is *false*. For more information, see [/debug (C# Compiler Options)](https://msdn.microsoft.com/en-us/library/8cw0bt21.aspx).`
        }),
        new AttributeSchema({
            name: "ErrorReport",
            description: `Optional **String** parameter.\nProvides a convenient way to report a C# internal error to Microsoft. This parameter can have a value of *prompt*, *send*, or *none*. If the parameter is set to *prompt*, you will receive a prompt when an internal compiler error occurs. The prompt lets you send a bug report electronically to Microsoft. If the parameter is set to *send*, a bug report is sent automatically. If the parameter is set to *none*, the error is reported only in the text output of the compiler. Default is *none*. For more information, see [/errorreport (C# Compiler Options)](https://msdn.microsoft.com/en-us/library/404y0x34.aspx).`
        }),
        new AttributeSchema({
            name: "FileAlignment",
            description: `Optional **Int32** parameter.\nSpecifies the size of sections in the output file. For more information, see [/filealign (C# Compiler Options)](https://msdn.microsoft.com/en-us/library/0s4tzdf2.aspx).`
        }),
        new AttributeSchema({
            name: "GenerateFullPaths",
            description: `Optional **Boolean** parameter.\nIf *true*, specifies the absolute path to the file in the compiler output. If *false*, specifies the name of the file. Default is *false*. For more information, see [/fullpaths (C# Compiler Options)](https://msdn.microsoft.com/en-us/library/d315xc66.aspx).`
        }),
        new AttributeSchema({
            name: "KeyContainer",
            description: `Optional **String** parameter.\nSpecifies the name of the cryptographic key container. For more information, see [/keycontainer (C# Compiler Options)](https://msdn.microsoft.com/en-us/library/5b92wy0h.aspx).`
        }),
        new AttributeSchema({
            name: "KeyFile",
            description: `Optional **String** parameter.\nSpecifies the file name containing the cryptographic key. For more information, see [/keyfile (C# Compiler Options)](https://msdn.microsoft.com/en-us/library/w2kyay38.aspx).`
        }),
        new AttributeSchema({
            name: "LangVersion",
            description: `Optional **String** parameter.\nSpecifies the version of the language to use. For more information, see [/langversion (C# Compiler Options)](https://msdn.microsoft.com/en-us/library/f4ckecs0.aspx).`
        }),
        new AttributeSchema({
            name: "LinkResources",
            description: `Optional **[ITaskItem](https://msdn.microsoft.com/en-us/library/microsoft.build.framework.itaskitem.aspx)[]** parameter.\nCreates a link to a .NET Framework resource in the output file; the resource file is not placed in the output file.\nItems passed into this parameter can have optional metadata entries named *LogicalName* and *Access*. *LogicalName* corresponds to the *identifier* parameter of the */linkresource* switch, and *Access* corresponds to *accessibility-modifier* parameter. For more information, see [/linkresource (C# Compiler Options)](https://msdn.microsoft.com/en-us/library/xawyf94k.aspx).`
        }),
        new AttributeSchema({
            name: "MainEntryPoint",
            description: `Optional **String** parameter.\nSpecifies the location of the *Main* method. For more information, see [/main (C# Compiler Options)](https://msdn.microsoft.com/en-us/library/x3eht538.aspx).`
        }),
        new AttributeSchema({
            name: "ModuleAssemblyName",
            description: `Optional **String** parameter.\nSpecifies the name of the assembly that this module will be a part of.`
        }),
        new AttributeSchema({
            name: "NoConfig",
            description: `Optional **Boolean** parameter.\nIf *true*, tells the compiler not to compile with the csc.rsp file. For more information, see [/noconfig (C# Compiler Options)](https://msdn.microsoft.com/en-us/library/8hww4s6c.aspx).`
        }),
        new AttributeSchema({
            name: "NoLogo",
            description: `Optional **Boolean** parameter.\nIf *true*, suppresses display of compiler banner information. For more information, see [/nologo (C# Compiler Options)](https://msdn.microsoft.com/en-us/library/z4fh6t3y.aspx).`
        }),
        new AttributeSchema({
            name: "NoStandardLib",
            description: `Optional **Boolean** parameter.\nIf *true*, prevents the import of mscorlib.dll, which defines the entire System namespace. Use this parameter if you want to define or create your own System namespace and objects. For more information, see [/nostdlib (C# Compiler Options)](https://msdn.microsoft.com/en-us/library/fa13yay7.aspx).`
        }),
        new AttributeSchema({
            name: "NoWin32Manifest",
            description: `Optional **Boolean** parameter.\nIf *true*, do not include the default Win32 manifest.`
        }),
        new AttributeSchema({
            name: "Optimize",
            description: `Optional **Boolean** parameter.\nIf *true*, enables optimizations. If *false*, disables optimizations. For more information, see [/optimize (C# Compiler Options)](https://msdn.microsoft.com/en-us/library/t0hfscdc.aspx).`
        }),
        new AttributeSchema({
            name: "OutputAssembly",
            description: `Optional **String** output parameter.\nSpecifies the name of the output file. For more information, see [/out (C# Compiler Options)](https://msdn.microsoft.com/en-us/library/bw3t50f3.aspx).`
        }),
        new AttributeSchema({
            name: "PdbFile",
            description: `Optional **String** parameter.\nSpecifies the debug information file name. The default name is the output file name with a .pdb extension.`
        }),
        new AttributeSchema({
            name: "Platform",
            description: `Optional **String** parameter.\nSpecifies the processor platform to be targeted by the output file. This parameter can have a value of *x86*, *x64*, or *anycpu*. Default is *anycpu*. For more information, see [/platform (C# Compiler Options)](https://msdn.microsoft.com/en-us/library/zekwfyz4.aspx).`
        }),
        new AttributeSchema({
            name: "References",
            description: `Optional **[ITaskItem](https://msdn.microsoft.com/en-us/library/microsoft.build.framework.itaskitem.aspx)[]** parameter.\nCauses the task to import public type information from the specified items into the current project. For more information, see [/reference (C# Compiler Options)](https://msdn.microsoft.com/en-us/library/yabyz3h4.aspx).\nYou can specify a Visual C# reference alias in an MSBuild file by adding the metadata *Aliases* to the original "Reference" item. For example, to set the alias "LS1" in the following CSC command line:\n**csc /r:LS1=MyCodeLibrary.dll /r:LS2=MyCodeLibrary2.dll *.cs**\nyou would use:\n*<Reference Include="MyCodeLibrary"> <Aliases>LS1</Aliases> </Reference>*`
        }),
        new AttributeSchema({
            name: "Resources",
            description: `Optional **[ITaskItem](https://msdn.microsoft.com/en-us/library/microsoft.build.framework.itaskitem.aspx)[]** parameter.\nEmbeds a .NET Framework resource into the output file.\nItems passed into this parameter can have optional metadata entries named *LogicalName* and *Access*. *LogicalName* corresponds to the *identifier* parameter of the */resource* switch, and *Access* corresponds to *accessibility-modifier* parameter. For more information, see [/resource (C# Compiler Options)](https://msdn.microsoft.com/en-us/library/c0tyye07.aspx).`
        }),
        new AttributeSchema({
            name: "ResponseFiles",
            description: `Optional **String** parameter.\nSpecifies the response file that contains commands for this task. For more information, see [@ (Specify Response File)](https://msdn.microsoft.com/en-us/library/8a1fs1tb.aspx).`
        }),
        new AttributeSchema({
            name: "Sources",
            description: `Optional **[ITaskItem](https://msdn.microsoft.com/en-us/library/microsoft.build.framework.itaskitem.aspx)[]** parameter.\nSpecifies one or more Visual C# source files.`
        }),
        new AttributeSchema({
            name: "TargetType",
            description: `Optional **String** parameter.\nSpecifies the file format of the output file. This parameter can have a value of *library*, which creates a code library, *exe*, which creates a console application, *module*, which creates a module, or *winexe*, which creates a Windows program. The default value is *library*. For more information, see [/target (C# Compiler Options)](https://msdn.microsoft.com/en-us/library/6h25dztx.aspx).`
        }),
        new AttributeSchema({
            name: "TreatWarningsAsErrors",
            description: `Optional **Boolean** parameter.\nIf *true*, treats all warnings as errors. For more information, see [/warnaserror (C# Compiler Options)](https://msdn.microsoft.com/en-us/library/406xhdz3.aspx).`
        }),
        new AttributeSchema({
            name: "UseHostCompilerIfAvailable",
            description: `Optional **Boolean** parameter.\nInstructs the task to use the in-process compiler object, if available. Used only by Visual Studio.`
        }),
        new AttributeSchema({
            name: "Utf8Output",
            description: `Optional **Boolean** parameter.\nLogs compiler output using UTF-8 encoding. For more information, see [/utf8output (C# Compiler Options)](https://msdn.microsoft.com/en-us/library/d5bxd1x2.aspx).`
        }),
        new AttributeSchema({
            name: "WarningLevel",
            description: `Optional **Int32** parameter.\nSpecifies the warning level for the compiler to display. For more information, see [/warn (C# Compiler Options)](https://msdn.microsoft.com/en-us/library/13b90fz7.aspx).`
        }),
        new AttributeSchema({
            name: "WarningsAsErrors",
            description: `Optional **String** parameter.\nSpecifies a list of warnings to treat as errors. For more information, see [/warnaserror (C# Compiler Options)](https://msdn.microsoft.com/en-us/library/406xhdz3.aspx).\nThis parameter overrides the *TreatWarningsAsErrors* parameter.`
        }),
        new AttributeSchema({
            name: "WarningsNotAsErrors",
            description: `Optional **String** parameter.\nSpecifies a list of warnings that are not treated as errors. For more information, see [/warnaserror (C# Compiler Options)](https://msdn.microsoft.com/en-us/library/406xhdz3.aspx).\nThis parameter is only useful if the *TreatWarningsAsErrors* parameter is set to *true*.`
        }),
        new AttributeSchema({
            name: "Win32Icon",
            description: `Optional **String** parameter.\nInserts an .ico file in the assembly, which gives the output file the desired appearance in File Explorer. For more information, see [/win32icon (C# Compiler Options)](https://msdn.microsoft.com/en-us/library/2aaxe43f.aspx).`
        }),
        new AttributeSchema({
            name: "Win32Manifest",
            description: `Optional **String** parameter.\nSpecifies the Win32 manifest to be included.`
        }),
        new AttributeSchema({
            name: "Win32Resource",
            description: `Optional **String** parameter.\nInserts a Win32 resource (.res) file in the output file. For more information, see [/win32res (C# Compiler Options)](https://msdn.microsoft.com/en-us/library/8f2f5x2e.aspx).`
        })
    ]
});

const deleteTaskSchema = new TaskSchema({
    name: "Delete",
    description: `Deletes the specified files.`,
    msdn: "https://msdn.microsoft.com/en-us/library/7wd15byf.aspx",
    attributes: [
        new AttributeSchema({
            name: "DeletedFiles",
            description: `Optional **[ITaskItem](https://msdn.microsoft.com/en-us/library/microsoft.build.framework.itaskitem.aspx)[]** output parameter.\nSpecifies the files that were successfully deleted.`
        }),
        new AttributeSchema({
            name: "Files",
            description: `Required **[ITaskItem](https://msdn.microsoft.com/en-us/library/microsoft.build.framework.itaskitem.aspx)[]** parameter.\nSpecifies the files to delete.`,
            required: true
        }),
        new AttributeSchema({
            name: "TreatErrorsAsWarnings",
            description: `Optional **Boolean** parameter.\nIf *true*, errors are logged as warnings. The default value is *false*.`
        })
    ]
});

const errorTaskSchema = new TaskSchema({
    name: "Error",
    description: "Stops a build and logs an error based on an evaluated conditional statement.",
    msdn: "https://msdn.microsoft.com/en-us/library/8b08t3s4.aspx",
    attributes: [
        new AttributeSchema({
            name: "Code",
            description: `Optional **String** parameter.\nThe error code to associate with the error.`
        }),
        new AttributeSchema({
            name: "File",
            description: `Optional **String** parameter.\nThe name of the file that contains the error. If no file name is provided, the file containing the Error task will be used.`
        }),
        new AttributeSchema({
            name: "HelpKeyword",
            description: `Optional **String** parameter.\nThe Help keyword to associate with the error.`
        }),
        new AttributeSchema({
            name: "Text",
            description: `Optional **String** parameter.\nThe error text that MSBuild logs if the *Condition* parameter evaluates to *true*.`
        })
    ]
});

const execTaskSchema = new TaskSchema({
    name: "Exec",
    description: `Runs the specified program or command by using the specified arguments.`,
    msdn: `https://msdn.microsoft.com/en-us/library/x8zx72cd.aspx`,
    attributes: [
        new AttributeSchema({
            name: "Command",
            description: `Required **String** parameter.\nThe command(s) to run. These can be system commands, such as attrib, or an executable, such as program.exe, runprogram.bat, or setup.msi.\nThis parameter can contain multiple lines of commands. Alternatively, you can put multiple commands in a batch file and run it by using this parameter.`,
            required: true
        }),
        new AttributeSchema({
            name: 'CustomErrorRegularExpression',
            description: `Optional **String** parameter.\nSpecifies a regular expression that is used to spot error lines in the tool output. This is useful for tools that produce unusually formatted output.`
        }),
        new AttributeSchema({
            name: "CustomWarningRegularExpression",
            description: `Optional **String** parameter.\nSpecifies a regular expression that is used to spot warning lines in the tool output. This is useful for tools that produce unusually formatted output.`
        }),
        new AttributeSchema({
            name: "ExitCode",
            description: `Optional **Int32** output read-only parameter.\nSpecifies the exit code that is provided by the executed command.`
        }),
        new AttributeSchema({
            name: "IgnoreExitCode",
            description: `Optional **Boolean** parameter.\nIf *true*, the task ignores the exit code that is provided by the executed command. Otherwise, the task returns *false* if the executed command returns a non-zero exit code.`
        }),
        new AttributeSchema({
            name: "IgnoreStandardErrorWarningFormat",
            description: `Optional **Boolean** parameter.\nIf *false*, selects lines in the output that match the standard error/warning format, and logs them as errors/warnings. If *true*, disable this behavior.`
        }),
        new AttributeSchema({
            name: "Outputs",
            description: `Optional **[ITaskItem](https://msdn.microsoft.com/en-us/library/microsoft.build.framework.itaskitem.aspx)[]** output parameter.\nContains the output items from the task. The *Exec* task does not set these itself. Instead, you can provide them as if it did set them, so that they can be used later in the project.`
        }),
        new AttributeSchema({
            name: "StdErrEncoding",
            description: `Optional **String** output parameter.\nSpecifies the encoding of the captured task standard error stream. The default is the current console output encoding.`
        }),
        new AttributeSchema({
            name: "StdOutEncoding",
            description: `Optional **String** output parameter.\nSpecifies the encoding of the captured task standard output stream. The default is the current console output encoding.`
        }),
        new AttributeSchema({
            name: "WorkingDirectory",
            description: `Optional **String** parameter.\nSpecifies the directory in which the command will run.`
        })
    ]
});

const findAppConfigFileTaskSchema = new TaskSchema({
    name: "FindAppConfigFile",
    description: `Finds the app.config file, if any, in the provided lists.`,
    msdn: "https://msdn.microsoft.com/en-us/library/ff595164.aspx",
    attributes: [
        new AttributeSchema({
            name: "AppConfigFile",
            description: `Optional **[ITaskItem](https://msdn.microsoft.com/en-us/library/microsoft.build.framework.itaskitem.aspx)[]** output parameter.\nSpecifies the first matching item found in the list, if any.`
        }),
        new AttributeSchema({
            name: "PrimaryList",
            description: `Required **[ITaskItem](https://msdn.microsoft.com/en-us/library/microsoft.build.framework.itaskitem.aspx)[]** parameter.\nSpecifies the primary list to search through.`,
            required: true
        }),
        new AttributeSchema({
            name: "SecondaryList",
            description: `Required **[ITaskItem](https://msdn.microsoft.com/en-us/library/microsoft.build.framework.itaskitem.aspx)[]** parameter.\nSpecifies the secondary list to search through.`,
            required: true
        }),
        new AttributeSchema({
            name: "TargetPath",
            description: `Required **String** parameter.\nSpecifies the value to add as metadata.`,
            required: true
        })
    ]
});

const findInListTaskSchema = new TaskSchema({
    name: "FindInList",
    description: `In a specified list, finds an item that has the matching itemspec.`,
    msdn: "https://msdn.microsoft.com/en-us/library/bb763047.aspx",
    attributes: [
        new AttributeSchema({
            name: "CaseSensitive",
            description: `Optional **Boolean** parameter.\nIf *true*, the search is case-sensitive; otherwise, it is not. Default value is *true*.`
        }),
        new AttributeSchema({
            name: "FindLastMatch",
            description: `Optional **Boolean** parameter.\nIf *true*, return the last match; otherwise, return the first match. Default value is *false*.`
        }),
        new AttributeSchema({
            name: "ItemFound",
            description: `Optional **[ITaskItem](https://msdn.microsoft.com/en-us/library/microsoft.build.framework.itaskitem.aspx)[]** read-only output parameter.\nThe first matching item found in the list, if any.`
        }),
        new AttributeSchema({
            name: "ItemSpecToFind",
            description: `Required **String** parameter.\nThe itemspec to search for.`,
            required: true
        }),
        new AttributeSchema({
            name: "List",
            description: `Required **[ITaskItem](https://msdn.microsoft.com/en-us/library/microsoft.build.framework.itaskitem.aspx)[]** parameter.\nThe list in which to search for the itemspec.`,
            required: true
        }),
        new AttributeSchema({
            name: "MatchFileNameOnly",
            description: `Optional **Boolean** parameter.\nIf *true*, match against just the file name part of the itemspec; otherwise, match against the whole itemspec. Default value is *true*.`
        })
    ]
});

const findUnderPathTaskSchema = new TaskSchema({
    name: "FindUnderPath",
    description: `Determines which items in the specified item collection have paths that are in or below the specified folder.`,
    msdn: `https://msdn.microsoft.com/en-us/library/ms164293.aspx`,
    attributes: [
        new AttributeSchema({
            name: "Files",
            description: `Optional **[ITaskItem](https://msdn.microsoft.com/en-us/library/microsoft.build.framework.itaskitem.aspx)[]** parameter.\nSpecifies the files whose paths should be compared with the path specified by the *Path* parameter.`
        }),
        new AttributeSchema({
            name: "InPath",
            description: `Optional **[ITaskItem](https://msdn.microsoft.com/en-us/library/microsoft.build.framework.itaskitem.aspx)[]** output parameter.\nContains the items that were found under the specified path.`
        }),
        new AttributeSchema({
            name: "OutOfPath",
            description: `Optional **[ITaskItem](https://msdn.microsoft.com/en-us/library/microsoft.build.framework.itaskitem.aspx)[]** output parameter.\nContains the items that were not found under the specified path.`
        }),
        new AttributeSchema({
            name: "Path",
            description: `Required **[ITaskItem](https://msdn.microsoft.com/en-us/library/microsoft.build.framework.itaskitem.aspx)** parameter.\nSpecifies the folder path to use as the reference.`,
            required: true
        }),
        new AttributeSchema({
            name: "UpdateToAbsolutePaths",
            description: `Optional **Boolean** parameter.\nIf *true*, the paths of the output items are updated to be absolute paths.`
        })
    ]
});

const formatUrlTaskSchema = new TaskSchema({
    name: "FormatUrl",
    description: `Converts a URL to a correct URL format.`,
    msdn: "https://msdn.microsoft.com/en-us/library/ff595161.aspx",
    attributes: [
        new AttributeSchema({
            name: "InputUrl",
            description: `Optional **String** parameter.\nSpecifies the URL to format.`
        }),
        new AttributeSchema({
            name: "OutputUrl",
            description: `Optional **String** output parameter.\nSpecifies the formatted URL.`
        })
    ]
});

const formatVersionTaskSchema = new TaskSchema({
    name: "FormatVersion",
    description: `Appends the revision number to the version number.\n+ Case #1: Input: Version=<undefined>; Revision=<don't care>; Output: OutputVersion="1.0.0.0"\n+ Case #2: Input: Version="1.0.0.*" Revision="5" Output: OutputVersion="1.0.0.5"\n+ Case #3: Input: Version="1.0.0.0" Revision=<don't care>; Output: OutputVersion="1.0.0.0"`,
    msdn: "https://msdn.microsoft.com/en-us/library/ff595162.aspx",
    attributes: [
        new AttributeSchema({
            name: "FormatType",
            description: `Optional **String** parameter.\nSpecifies the format type.\n- "Version" = version.\n- "Path" = replace "." with "_";`
        }),
        new AttributeSchema({
            name: "OutputVersion",
            description: `Optional **String** output parameter.\nSpecifies the output version that includes the revision number.`
        }),
        new AttributeSchema({
            name: "Revision",
            description: `Optional **Int32** parameter.\nSpecifies the revision to append to the version.`
        }),
        new AttributeSchema({
            name: "Version",
            description: `Optional **String** parameter.\nSpecifies the version number string to format.`
        })
    ]
});

const generateApplicationManifestTaskSchema = new TaskSchema({
    name: "GenerateApplicationManifest",
    description: `Generates a ClickOnce application manifest or a native manifest. A native manifest describes a component by defining a unique identity for the component and identifying all assemblies and files that make up the component. A ClickOnce application manifest extends a native manifest by indicating the entry point of the application, and specifying the application security level.`,
    msdn: "https://msdn.microsoft.com/en-us/library/6wc2ccdc.aspx",
    attributes: [
        new AttributeSchema({
            name: "AssemblyName",
            description: `Optional **String** parameter.\nSpecifies the *Name* field of the assembly identity for the generated manifest. If this parameter is not specified, the name is inferred from the *EntryPoint* or *InputManifest* parameters. If no name can be created, the task throws an error.`
        }),
        new AttributeSchema({
            name: "AssemblyVersion",
            description: `Optional **String** parameter.\nSpecifies the *Version* field of the assembly identity for the generated manifest. If this parameter is not specified, a default value of "1.0.0.0" is used.`
        }),
        new AttributeSchema({
            name: "ClrVersion",
            description: `Optional **String** parameter.\nSpecifies the minimum version of the Common Language Runtime (CLR) required by the application. The default value is the CLR version in use by the build system. If the task is generating a native manifest, this parameter is ignored.`
        }),
        new AttributeSchema({
            name: "ConfigFile",
            description: `Optional **[ITaskItem](https://msdn.microsoft.com/en-us/library/microsoft.build.framework.itaskitem.aspx)[]** parameter.\nSpecifies which item contains the application configuration file. If the task is generating a native manifest, this parameter is ignored.`
        }),
        new AttributeSchema({
            name: "Dependencies",
            description: `Optional **[ITaskItem](https://msdn.microsoft.com/en-us/library/microsoft.build.framework.itaskitem.aspx)[]** parameter.\nSpecifies an item list that defines the set of dependent assemblies for the generated manifest. Each item may be further described by item metadata to indicate additional deployment state and the type of dependence. For more information, see the "Item Metadata" section below.`
        }),
        new AttributeSchema({
            name: "Description",
            description: `Optional **String** parameter.\nSpecifies the description for the application or component.`
        }),
        new AttributeSchema({
            name: "EntryPoint",
            description: `Optional **[ITaskItem](https://msdn.microsoft.com/en-us/library/microsoft.build.framework.itaskitem.aspx)[]** parameter.\nSpecifies a single item that indicates the entry point for the generated manifest assembly.\nFor a ClickOnce application manifest, this parameter specifies the assembly that starts when the application is run.`
        }),
        new AttributeSchema({
            name: "ErrorReportUrl",
            description: `Optional **String** parameter.\nSpecifies the URL of the Web page that is displayed in dialog boxes during error reports in ClickOnce installations.`
        }),
        new AttributeSchema({
            name: "FileAssociations",
            description: `Optional **[ITaskItem](https://msdn.microsoft.com/en-us/library/microsoft.build.framework.itaskitem.aspx)[]** parameter.\nSpecifies a list of one or more file type that are associated with the ClickOnce deployment manifest.\nFile associations only valid only when .NET Framework 3.5 or later is targeted.`
        }),
        new AttributeSchema({
            name: "Files",
            description: `Optional **[ITaskItem](https://msdn.microsoft.com/en-us/library/microsoft.build.framework.itaskitem.aspx)[]** parameter.\nThe files to include in the manifest. Specify the full path for each file.`
        }),
        new AttributeSchema({
            name: "HostInBrowser",
            description: `Optional **Boolean** parameter.\nIf *true*, the application is hosted in a browser (as are WPF Web Browser Applications).`
        }),
        new AttributeSchema({
            name: "IconFile",
            description: `Optional **[ITaskItem](https://msdn.microsoft.com/en-us/library/microsoft.build.framework.itaskitem.aspx)[]** parameter.\nIndicates the application icon file. The application icon is expressed in the generated application manifest and is used for the Start Menu and Add/Remove Programs dialog. If this input is not specified, a default icon is used. If the task is generating a native manifest, this parameter is ignored.`
        }),
        new AttributeSchema({
            name: "InputManifest",
            description: `Optional **[ITaskItem](https://msdn.microsoft.com/en-us/library/microsoft.build.framework.itaskitem.aspx)** parameter.\nIndicates an input XML document to serve as a base for the manifest generator. This allows structured data such as application security or custom manifest definitions to be reflected in the output manifest. The root element in the XML document must be an assembly node in the asmv1 namespace.`
        }),
        new AttributeSchema({
            name: "IsolatedComReferences",
            description: `Optional **[ITaskItem](https://msdn.microsoft.com/en-us/library/microsoft.build.framework.itaskitem.aspx)[]** parameter.\nSpecifies COM components to isolate in the generated manifest. This parameter supports the ability to isolate COM components for "Registration Free COM" deployment. It works by auto-generating a manifest with standard COM registration definitions. However, the COM components must be registered on the build machine in order for this to function properly.`
        }),
        new AttributeSchema({
            name: "ManifestType",
            description: `Optional **String** parameter.\nSpecifies which type of manifest to generate. This parameter can have the following values:\n- *Native*\n- *ClickOnce*\n\nIf this parameter is not specified, the task defaults to *ClickOnce*.`
        }),
        new AttributeSchema({
            name: "MaxTargetPath",
            description: `Optional **String** parameter.\nSpecifies the maximum allowable length of a file path in a ClickOnce application deployment. If this value is specified, the length of each file path in the application is checked against this limit. Any items that exceed the limit will raise in a build warning. If this input is not specified or is zero, then no checking is performed. If the task is generating a native manifest, this parameter is ignored.`
        }),
        new AttributeSchema({
            name: "OSVersion",
            description: `Optional **String** parameter.\nSpecifies the minimum required operating system (OS) version required by the application. For example, the value "5.1.2600.0" indicates the operating system is Windows XP. If this parameter is not specified, the value "4.10.0.0" is used, which indicates Windows 98 Second Edition, the minimum supported OS of the .NET Framework. If the task is generating a native manifest, this input is ignored.`
        }),
        new AttributeSchema({
            name: "OutputManifest",
            description: `Optional **[ITaskItem](https://msdn.microsoft.com/en-us/library/microsoft.build.framework.itaskitem.aspx)** output parameter.\nSpecifies the name of the generated output manifest file. If this parameter is not specified, the name of the output file is inferred from the identity of the generated manifest.`
        }),
        new AttributeSchema({
            name: "Platform",
            description: `Optional **String** parameter.\nSpecifies the target platform of the application. This parameter can have the following values:\n- *AnyCPU*\n- *x86*\n- *x64*\n- *Itanium*\n\nIf this parameter is not specified, the task defaults to *AnyCPU*.`
        }),
        new AttributeSchema({
            name: "Product",
            description: `Optional **String** parameter.\nSpecifies the name of the application. If this parameter is not specified, the name is inferred from the identity of the generated manifest. This name is used for the shortcut name on the Start menu and is part of the name that appears in the Add or Remove Programs dialog box.`
        }),
        new AttributeSchema({
            name: "Publisher",
            description: `Optional **String** parameter.\nSpecifies the publisher of the application. If this parameter is not specified, the name is inferred from the registered user, or the identity of the generated manifest. This name is used for the folder name on the Start menu and is part of the name that appears in the Add or Remove Programs dialog box.`
        }),
        new AttributeSchema({
            name: "RequiresMinimumFramework35SP1",
            description: `Optional **Boolean** parameter.\nIf *true*, the application requires the .NET Framework 3.5 SP1 or a more recent version.`
        }),
        new AttributeSchema({
            name: "TargetCulture",
            description: `Optional **String** parameter.\nIdentifies the culture of the application and specifies the *Language* field of the assembly identity for the generated manifest. If this parameter is not specified, it is assumed the application is culture invariant.`
        }),
        new AttributeSchema({
            name: "TargetFrameworkMoniker",
            description: `Optional **String** parameter.\nSpecifies the target framework moniker.`
        }),
        new AttributeSchema({
            name: "TargetFrameworkProfile",
            description: `Optional **String** parameter.\nSpecifies the target framework profile.`
        }),
        new AttributeSchema({
            name: "TargetFrameworkSubset",
            description: `Optional **String** parameter.\nSpecifies the name of the .NET Framework subset to target.`
        }),
        new AttributeSchema({
            name: "TargetFrameworkVersion",
            description: `Optional **String** parameter.\nSpecifies the target .NET Framework of the project.`
        }),
        new AttributeSchema({
            name: "TrustInfoFile",
            description: `Optional **[ITaskItem](https://msdn.microsoft.com/en-us/library/microsoft.build.framework.itaskitem.aspx)** parameter.\nIndicates an XML document that specifies the application security. The root element in the XML document must be a trustInfo node in the asmv2 namespace. If the task is generating a native manifest, this parameter is ignored.`
        }),
        new AttributeSchema({
            name: "UseApplicationTrust",
            description: `Optional **Boolean** parameter.\nIf *true*, the *Product*, *Publisher*, and *SupportUrl* properties are written to the application manifest.`
        })
    ]
});

const generateBootstrapperTaskSchema = new TaskSchema({
    name: "GenerateBootstrapper",
    description: `Provides an automated way to detect, download, and install an application and its prerequisites. It serves as a single installer that integrates the separate installers for all the components making up an application.`,
    msdn: `https://msdn.microsoft.com/en-us/library/ms164294.aspx`,
    attributes: [
        new AttributeSchema({
            name: "ApplicationFile",
            description: `Optional **String** parameter.\nSpecifies the file the bootstrapper will use to begin the installation of the application after all prerequisites have been installed. A build error will result if neither the *BootstrapperItems* nor the *ApplicationFile* parameter is specified.`
        }),
        new AttributeSchema({
            name: "ApplicationName",
            description: `Optional **String** parameter.\nSpecifies the name of the application that the bootstrapper will install. This name will appear in the UI the bootstrapper uses during installation.`
        }),
        new AttributeSchema({
            name: "ApplicationRequiresElevation",
            description: `Optional **Boolean** parameter.\nIf *true*, the component runs with elevated permissions when it is installed on a target computer.`
        }),
        new AttributeSchema({
            name: "ApplicationUrl",
            description: `Optional **String** parameter.\nSpecifies the Web location that is hosting the application’s installer.`
        }),
        new AttributeSchema({
            name: "BootstrapperComponentFiles",
            description: `Optional **String[]** output parameter.\nSpecifies the built location of bootstrapper package files.`
        }),
        new AttributeSchema({
            name: "BootstrapperItems",
            description: `Optional **[ITaskItem](https://msdn.microsoft.com/en-us/library/microsoft.build.framework.itaskitem.aspx)[]** parameter.\nSpecifies the products to build into the bootstrapper.\nThe *Include* attribute is used to represent the name of a prerequisite which should be installed. The *ProductName* item metadata is optional, and will be used by the build engine as a user-friendly name in case the package cannot be found. These items are not required MSBuild input parameters unless no *ApplicationFile* is specified. You should include one item for every prerequisite which must be installed for your application.\nA build error will result if neither the *BootstrapperItems* nor the *ApplicationFile* parameter is specified.`
        }),
        new AttributeSchema({
            name: "BootstrapperKeyFile",
            description: `Optional **String** output parameter.\nSpecifies the built location of setup.exe.`
        }),
        new AttributeSchema({
            name: "ComponentsLocation",
            description: `Optional **String** parameter.\nSpecifies a location for the bootstrapper to look for installation prerequisites to install. This parameter can have the following values:\n+ *HomeSite*: Indicates that the prerequisite is being hosted by the component vendor.\n+ *Relative*: Indicates that the preqrequisite is at the same location of the application.\n+ *Absolute*: Indicates that all components are to be found at a centralized URL. This value should be used in conjunction with the ComponentsUrl input parameter.\n\nIf *ComponentsLocation* is not specified, *HomeSite* is used by default.`
        }),
        new AttributeSchema({
            name: "ComponentsUrl",
            description: `Optional **String** parameter.\nSpecifies the URL containing the installation prerequisites.`
        }),
        new AttributeSchema({
            name: "CopyComponents",
            description: `Optional **Boolean** parameter.\nIf *true*, the bootstrapper copies all output files to the path specified in the *OutputPath* parameter. The values of the *BootstrapperComponentFiles* parameter should all be based on this path. If *false*, the files are not copied, and the *BootstrapperComponentFiles* values are based on the value of the *Path* parameter. The default value of this parameter is *true*.`
        }),
        new AttributeSchema({
            name: "Culture",
            description: `Optional **String** parameter.\nSpecifies the culture to use for the bootstrapper UI and installation prerequisites. If the specified culture is unavailabe, the task uses the value of the *FallbackCulture* parameter.`
        }),
        new AttributeSchema({
            name: "FallbackCulture",
            description: `Optional **String** parameter.\nSpecifies the secondary culture to use for the bootstraper UI and installation prerequisites.`
        }),
        new AttributeSchema({
            name: "OutputPath",
            description: `Optional **String** parameter.\nSpecifies the location to copy setup.exe and all package files.`
        }),
        new AttributeSchema({
            name: "Path",
            description: `Optional **String** parameter.\nSpecifies the location of all available prerequisite packages.`
        }),
        new AttributeSchema({
            name: "SupportUrl",
            description: `Optional **String** parameter.\nSpecifies the URL to provide should the bootstrapper installation fail.`
        }),
        new AttributeSchema({
            name: "Validate",
            description: `Optional **Boolean** parameter.\nIf *true*, the bootstrapper performs XSD validation on the specified input bootstrapper items. The default value of this parameter is *false*.`
        })
    ]
});

const generateDeploymentManifestTaskSchema = new TaskSchema({
    name: "GenerateDeploymentManifest",
    description: `Generates a ClickOnce deployment manifest. A ClickOnce deployment manifest describes the deployment of an application by defining a unique identity for the deployment, identifying deployment traits such as install or online mode, specifying application update settings and update locations, and indicating the corresponding ClickOnce application manifest.`,
    msdn: "https://msdn.microsoft.com/en-us/library/3k2t34e7.aspx",
    attributes: [
        new AttributeSchema({
            name: "AssemblyName",
            description: `Optional **String** parameter.\nSpecifies the *Name* field of the assembly identity for the generated manifest. If this parameter is not specified, the name is inferred from the *EntryPoint* or *InputManifest* parameters. If the name cannot be inferred, the task throws an error.`
        }),
        new AttributeSchema({
            name: "AssemblyVersion",
            description: `Optional **String** parameter.\nSpecifies the *Version* field of the assembly identity for the generated manifest. If this parameter is not specified, the task uses the value "1.0.0.0".`
        }),
        new AttributeSchema({
            name: "CreateDesktopShortcut",
            description: `Optional **Boolean** parameter.\nIf *true*, an icon is created on the desktop during ClickOnce application installation.`
        }),
        new AttributeSchema({
            name: "DeploymentUrl",
            description: `Optional **String** parameter.\nSpecifies the update location for the application. If this parameter is not specified, no update location is defined for the application. However, if the *UpdateEnabled* parameter is *true*, the update location must be specified. The specified value should be a fully qualified URL or UNC path.`
        }),
        new AttributeSchema({
            name: "Description",
            description: `Optional **String** parameter.\nSpecifies an optional description for the application.`
        }),
        new AttributeSchema({
            name: "DisallowUrlActivation",
            description: `Optional **Boolean** parameter.\nSpecifies whether the application should be run automatically when it is opened through a URL. If this parameter is *true*, the application can only be started from the Start menu. The default value of this parameter is *false*. This input applies only when the *Install* parameter value is *true*.`
        }),
        new AttributeSchema({
            name: "EntryPoint",
            description: `Optional **[ITaskItem](https://msdn.microsoft.com/en-us/library/microsoft.build.framework.itaskitem.aspx)[]** parameter.\nIndicates the entry point for the generated manifest assembly. For a ClickOnce deployment manifest, this input specifies the ClickOnce application manifest.\nIn Visual Studio 2005, the [GenerateApplicationManifest Task](https://msdn.microsoft.com/en-us/library/6wc2ccdc.aspx) required an *EntryPoint* to generate an application manifest. (Assembly or native manifests do not require an *EntryPoint*.) This requirement was enforced with the build error: "MSB3185: EntryPoint not specified for manifest."\nMSBuild does not issue this error when the *EntryPoint* task parameter is not specified. Instead, the <customHostSpecified> tag is inserted as a child of the <entryPoint> tag, for example:\n*<entryPoint xmlns="urn:schemas-microsoft-com:asm.v2">\n<co.v1:customHostSpecified />\n</entryPoint>*\nYou can add DLL dependencies to the application manifest by using the following steps:\n1. Resolve the assembly references with a call to [ResolveAssemblyReference](https://msdn.microsoft.com/en-us/library/microsoft.build.tasks.resolveassemblyreference.aspx).\n2. Pass the output of the previous task and the assembly itself to [ResolveManifestFiles](https://msdn.microsoft.com/en-us/library/microsoft.build.tasks.resolvemanifestfiles.aspx).\n3. Pass the dependencies by using the *Dependencies* parameter to [GenerateApplicationManifest](https://msdn.microsoft.com/en-us/library/microsoft.build.tasks.generateapplicationmanifest.aspx).`
        }),
        new AttributeSchema({
            name: "ErrorReportUrl",
            description: `Optional **String** parameter.\nSpecifies the URL of the Web page that is displayed in dialog boxes during ClickOnce installations.`
        }),
        new AttributeSchema({
            name: "InputManifest",
            description: `Optional **[ITaskItem](https://msdn.microsoft.com/en-us/library/microsoft.build.framework.itaskitem.aspx)** parameter.\nIndicates an input XML document to serve as a base for the manifest generator. This enables structured data, such as custom manifest definitions, to be reflected in the output manifest. The root element in the XML document must be an assembly node in the asmv1 namespace.`
        }),
        new AttributeSchema({
            name: "Install",
            description: `Optional **Boolean** parameter.\nSpecifies whether the application is an installed application or an online-only application. If this parameter is *true*, the application will be installed on the user’s Start menu, and can be removed by using the Add or Remove Programs dialog box. If this parameter is *false*, the application is intended for online use from a Web page. The default value of this parameter is *true*.`
        }),
        new AttributeSchema({
            name: "MapFileExtensions",
            description: `Optional **Boolean** parameter.\nSpecifies whether the .deploy file name extension mapping is used. If this parameter is *true*, every program file is published with a .deploy file name extension. This option is useful for Web server security to limit the number of file name extensions that must be unblocked to enable ClickOnce application deployment. The default value of this parameter is *false*.`
        }),
        new AttributeSchema({
            name: "MaxTargetPath",
            description: `Optional **String** parameter.\nSpecifies the maximum allowed length of a file path in a ClickOnce application deployment. If this parameter is specified, the length of each file path in the application is checked against this limit. Any items that exceed the limit will cause a build warning. If this input is not specified or is zero, no checking is performed.`
        }),
        new AttributeSchema({
            name: "MinimumRequiredVersion",
            description: `Optional **String** parameter.\nSpecifies whether the user can skip the update. If the user has a version that is less than the minimum required, he will not have the option to skip the update. This input only applies when the value of the *Install* parameter is *true*.`
        }),
        new AttributeSchema({
            name: "OutputManifest",
            description: `Optional **[ITaskItem](https://msdn.microsoft.com/en-us/library/microsoft.build.framework.itaskitem.aspx)** parameter.\nSpecifies the name of the generated output manifest file. If this parameter is not specified, the name of the output file is inferred from the identity of the generated manifest.`
        }),
        new AttributeSchema({
            name: "Platform",
            description: `Optional **String** parameter.\nSpecifies the target platform of the application. This parameter can have the following values:\n- *AnyCPU*\n- *x86*\n- *x64*\n- *Itanium*\n\nThe default value is *AnyCPU*.`
        }),
        new AttributeSchema({
            name: "Product",
            description: `Optional **String** parameter.\nSpecifies the name of the application. If this parameter is not specified, the name is inferred from the identity of the generated manifest. This name is used for the shortcut name on the Start menu and is part of the name that appears in the Add or Remove Programs dialog box.`
        }),
        new AttributeSchema({
            name: "Publisher",
            description: `Optional **String** parameter.\nSpecifies the publisher of the application. If this parameter is not specified, the name is inferred from the registered user, or the identity of the generated manifest. This name is used for the folder name on the Start menu and is part of the name that appears in the Add or Remove Programs dialog box.`
        }),
        new AttributeSchema({
            name: "SuiteNamel",
            description: `Optional **String** parameter.\nSpecifies the name of the folder on the Start menu where the application is located after ClickOnce deployment.`
        }),
        new AttributeSchema({
            name: "SupportUrl",
            description: `Optional **String** parameter.\nSpecifies the link that appears in the Add or Remove Programs dialog box for the application. The specified value should be a fully qualified URL or UNC path.`
        }),
        new AttributeSchema({
            name: "TargetCulture",
            description: `Optional **String** parameter.\nIdentifies the culture of the application, and specifies the *Language* field of the assembly identity for the generated manifest. If this parameter is not specified, it is assumed that the application is culture invariant.`
        }),
        new AttributeSchema({
            name: "TrustUrlParameters",
            description: `Optional **Boolean** parameter.\nSpecifies whether URL query-string parameters should be made available to the application. The default value of this parameter is *false*, which indicates that parameters will not be available to the application.`
        }),
        new AttributeSchema({
            name: "UpdateEnabled",
            description: `Optional **Boolean** parameter.\nIndicates whether the application is enabled for updates. The default value of this parameter is *false*. This parameter only applies when the value of the *Install* parameter is *true*.`
        }),
        new AttributeSchema({
            name: "UpdateInterval",
            description: `Optional **Int32** parameter.\nSpecifies the update interval for the application. The default value of this parameter is zero. This parameter only applies when the values of the *Install* and *UpdateEnabled* parameters are both *true*.`
        }),
        new AttributeSchema({
            name: "UpdateMode",
            description: `Optional **String** parameter.\nSpecifies whether updates should be checked in the foreground before the application is started, or in the background as the application is running. This parameter can have the following values:\n- *Foreground*\n- *Background*\n\nThe default value of this parameter is *Background*. This parameter only applies when the values of the *Install* and *UpdateEnabled* parameters are both *true*.`
        }),
        new AttributeSchema({
            name: "UpdateUnit",
            description: `Optional **String** parameter.\nSpecifies the units for the *UpdateInterval* parameter. This parameter can have the following values:\n- *Hours*\n- *Days*\n- *Weeks*\n\nThis parameter only applies when the values of the *Install* and *UpdateEnabled* parameters are both *true*.`
        })
    ]
});

const generateResourceTaskSchema = new TaskSchema({
    name: "GenerateResource",
    description: `Converts between .txt and .resx (XML-based resource format) files and common language runtime binary .resources files that can be embedded in a runtime binary executable or compiled into satellite assemblies. This task is typically used to convert .txt or .resx files to .resource files. The *GenerateResource* task is functionally similar to [resgen.exe](https://msdn.microsoft.com/en-us/library/ccec7sz1.aspx).`,
    msdn: "https://msdn.microsoft.com/en-us/library/ms164295.aspx",
    attributes: [
        new AttributeSchema({
            name: "AdditionalInputs",
            description: `Optional **[ITaskItem](https://msdn.microsoft.com/en-us/library/microsoft.build.framework.itaskitem.aspx)[]** parameter.\nContains additional inputs to the dependency checking done by this task. For example, the project and targets files typically should be inputs, so that if they are updated, all resources are regenerated.`
        }),
        new AttributeSchema({
            name: "EnvironmentVariables",
            description: `Optional **String[]** parameter.\nSpecifies an array of name-value pairs of environment variables that should be passed to the spawned resgen.exe, in addition to (or selectively overriding) the regular environment block.`
        }),
        new AttributeSchema({
            name: "ExcludedInputPaths",
            description: `Optional **[ITaskItem](https://msdn.microsoft.com/en-us/library/microsoft.build.framework.itaskitem.aspx)[]** parameter.\nSpecifies an array of items that specify paths from which tracked inputs will be ignored during Up to date checking.`
        }),
        new AttributeSchema({
            name: "ExecuteAsTool",
            description: `Optional **Boolean** parameter.\nIf *true*, runs tlbimp.exe and aximp.exe from the appropriate target framework out-of-proc to generate the necessary wrapper assemblies. This parameter allows multi-targeting of *ResolveComReferences*.`
        }),
        new AttributeSchema({
            name: "FilesWritten",
            description: `Optional **[ITaskItem](https://msdn.microsoft.com/en-us/library/microsoft.build.framework.itaskitem.aspx)[]** output parameter.\nContains the names of all files written to disk. This includes the cache file, if any. This parameter is useful for implementations of Clean.`
        }),
        new AttributeSchema({
            name: "MinimalRebuildFromTracking",
            description: `Optional **Boolean** parameter.\nGets or sets a switch that specifies whether tracked incremental build will be used. If *true*, incremental build is turned on; otherwise, a rebuild will be forced.`
        }),
        new AttributeSchema({
            name: "NeverLockTypeAssemblies",
            description: `Optional **Boolean** parameter.\nSpecifies the name of the generated files, such as .resources files. If you do not specify a name, the name of the matching input file is used and the .resources file that is created is placed in the directory that contains the input file.`
        }),
        new AttributeSchema({
            name: "OutputResources",
            description: `Optional **[ITaskItem](https://msdn.microsoft.com/en-us/library/microsoft.build.framework.itaskitem.aspx)[]** output parameter.\nSpecifies the name of the generated files, such as .resources files. If you do not specify a name, the name of the matching input file is used and the .resources file that is created is placed in the directory that contains the input file.`
        }),
        new AttributeSchema({
            name: "PublicClass",
            description: `Optional **Boolean** parameter.\nIf *true*, creates a strongly typed resource class as a public class.`
        }),
        new AttributeSchema({
            name: "References",
            description: `Optional **String[]** parameter.\nReferences to load types in .resx files from. Resx file data elements may have a .NET type. When the .resx file is read, this must be resolved. Typically, it is resolved successfully by using standard type loading rules. If you provide assemblies in *References*, they take precedence.\nThis parameter is not required for strongly typed resources.`
        }),
        new AttributeSchema({
            name: "SdkToolsPath",
            description: `Optional **String** parameter.\nSpecifies the path to the SDK tools, such as resgen.exe.`
        }),
        new AttributeSchema({
            name: "Sources",
            description: `Required **[ITaskItem](https://msdn.microsoft.com/en-us/library/microsoft.build.framework.itaskitem.aspx)[]** parameter.\nSpecifies the items to convert. Items passed to this parameter must have one of the following file extensions:\n- *.txt*: Specifies the extension for a text file to convert. Text files can only contain string resources.\n- *.resx*: Specifies the extension for an XML-based resource file to convert.\n- *.restext*: Specifies the same format as .txt. This different extension is useful if you want to clearly distinguish source files that contain resources from other source files in your build process.\n- *.resources*: Specifies the extension for a resource file to convert.`,
            required: true
        }),
        new AttributeSchema({
            name: "StateFile",
            description: `Optional **[ITaskItem](https://msdn.microsoft.com/en-us/library/microsoft.build.framework.itaskitem.aspx)** parameter.\nSpecifies the path to an optional cache file that is used to speed up dependency checking of links in .resx input files.`
        }),
        new AttributeSchema({
            name: "StronglyTypedClassName",
            description: `Optional **String** parameter.\nSpecifies the class name for the strongly typed resource class. If this parameter is not specified, the base name of the resource file is used.`
        }),
        new AttributeSchema({
            name: "StronglyTypedFilename",
            description: `Optional **[ITaskItem](https://msdn.microsoft.com/en-us/library/microsoft.build.framework.itaskitem.aspx)** parameter.\nSpecifies the filename for the source file. If this parameter is not specified, the name of the class is used as the base filename, with the extension dependent on the language. For example: *MyClass.cs*.`
        }),
        new AttributeSchema({
            name: "StronglyTypedLanguage",
            description: `Optional **String** parameter.\nSpecifies the language to use when generating the class source for the strongly typed resource. This parameter must match exactly one of the languages used by the CodeDomProvider. For example: *VB* or *C#*.\nBy passing a value to this parameter, you instruct the task to generate strongly typed resources.`
        }),
        new AttributeSchema({
            name: "StronglyTypedManifestPrefix",
            description: `Optional **String** parameter.\nSpecifies the resource namespace or manifest prefix to use in the generated class source for the strongly typed resource.`
        }),
        new AttributeSchema({
            name: "StronglyTypedNamespace",
            description: `Optional **String** parameter.\nSpecifies the namespace to use for the generated class source for the strongly typed resource. If this parameter is not specified, any strongly typed resources are in the global namespace.`
        }),
        new AttributeSchema({
            name: "TLogReadFiles",
            description: `Optional **[ITaskItem](https://msdn.microsoft.com/en-us/library/microsoft.build.framework.itaskitem.aspx)[]** read-only parameter.\nGets an array of items that represent the read tracking logs.`
        }),
        new AttributeSchema({
            name: "TLogWriteFiles",
            description: `Optional **[ITaskItem](https://msdn.microsoft.com/en-us/library/microsoft.build.framework.itaskitem.aspx)[]** read-only parameter.\nGets an array of items that represent the write tracking logs.`
        }),
        new AttributeSchema({
            name: "ToolArchitecture",
            description: `Optional **String** parameter.\nUsed to determine whether or not Tracker.exe needs to be used to spawn ResGen.exe.\nShould be parsable to a member of the [ExecutableType](https://msdn.microsoft.com/en-us/library/microsoft.build.utilities.executabletype.aspx) enumeration. If *String.Empty*, uses a heuristic to determine a default architecture. Should be parsable to a member of the Microsoft.Build.Utilities.ExecutableType enumeration.`
        }),
        new AttributeSchema({
            name: "TrackerFrameworkPath",
            description: `Optional **String** parameter.\nSpecifies the path to the appropriate .NET Framework location that contains FileTracker.dll.\nIf set, the user takes responsibility for making sure that the bitness of the FileTracker.dll that they pass matches the bitness of the ResGen.exe that they intend to use. If not set, the task decides the appropriate location based on the current .NET Framework version.`
        }),
        new AttributeSchema({
            name: "TrackerLogDirectory",
            description: `Optional **String** parameter.\nSpecifies the intermediate directory into which the tracking logs from running this task will be placed.`
        }),
        new AttributeSchema({
            name: "TrackerSdkPath",
            description: `Optional **String** parameter.\nSpecifies the path to the appropriate Windows SDK location that contains Tracker.exe.\nIf set, the user takes responsibility for making sure that the bitness of the Tracker.exe that they pass matches the bitness of the ResGen.exe that they intend to use. If not set, the task decides the appropriate location based on the current Windows SDK.`
        }),
        new AttributeSchema({
            name: "TrackFileAccess",
            description: `Optional **Boolean** parameter.\nIf *true*, the directory of the input file is used for resolving relative file paths.`
        }),
        new AttributeSchema({
            name: "UseSourcePath",
            description: `Optional **Boolean** parameter.\nIf *true*, specifies that the input file's directory is to be used for resolving relative file paths.`
        })
    ]
});

const generateTrustInfoTaskSchema = new TaskSchema({
    name: "GenerateTrustInfo",
    description: `Generates the application trust from the base manifest, and from the *TargetZone* and *ExcludedPermissions* parameters.`,
    msdn: "https://msdn.microsoft.com/en-us/library/ff595160.aspx",
    attributes: [
        new AttributeSchema({
            name: "ApplicationDependencies",
            description: `Optional **[ITaskItem](https://msdn.microsoft.com/en-us/library/microsoft.build.framework.itaskitem.aspx)[]** parameter.\nSpecifies the dependent assemblies.`
        }),
        new AttributeSchema({
            name: "BaseManifest",
            description: `Optional **[ITaskItem](https://msdn.microsoft.com/en-us/library/microsoft.build.framework.itaskitem.aspx)** parameter.\nSpecifies the base manifest to generate the application trust from.`
        }),
        new AttributeSchema({
            name: "ExcludedPermissions",
            description: `Optional **String** parameter.\nSpecifies one or more semicolon-separated permission identity values to be excluded from the zone default permission set.`
        }),
        new AttributeSchema({
            name: "TargetZone",
            description: `Optional **String** parameter.\nSpecifies a zone default permission set, which is obtained from machine policy.`
        }),
        new AttributeSchema({
            name: "TrustInfoFile",
            description: `Required **[ITaskItem](https://msdn.microsoft.com/en-us/library/microsoft.build.framework.itaskitem.aspx)** output parameter.\nSpecifies the file that contains the application security trust information.`,
            required: true
        })
    ]
});

const getAssemblyIdentityTaskSchema = new TaskSchema({
    name: "GetAssemblyIdentity",
    description: `Retrieves the assembly identities from the specified files and outputs the identity information.`,
    msdn: "https://msdn.microsoft.com/en-us/library/ms164296.aspx",
    attributes: [
        new AttributeSchema({
            name: "Assemblies",
            description: `Optional **[ITaskItem](https://msdn.microsoft.com/en-us/library/microsoft.build.framework.itaskitem.aspx)[]** output parameter.\nContains the retrieved assembly identities.`
        }),
        new AttributeSchema({
            name: 'AssemblyFiles',
            description: `Required **[ITaskItem](https://msdn.microsoft.com/en-us/library/microsoft.build.framework.itaskitem.aspx)[]** parameter.\nSpecifies the files to retrieve identities from.`,
            required: true
        })
    ]
});

const getFrameworkPathTaskSchema = new TaskSchema({
    name: "GetFrameworkPath",
    description: `Retrieves the path to the .NET Framework assemblies. If several versions of the .NET Framework are installed, this task returns the version that MSBuild is designed to run on.`,
    msdn: `https://msdn.microsoft.com/en-us/library/ms164297.aspx`,
    attributes: [
        new AttributeSchema({
            name: "FrameworkVersion11Path",
            description: `Optional **String** output parameter.\nContains the path to the framework version 1.1 assemblies, if present. Otherwise returns *null*.`
        }),
        new AttributeSchema({
            name: "FrameworkVersion20Path",
            description: `Optional **String** output parameter.\nContains the path to the framework version 2.0 assemblies, if present. Otherwise returns *null*.`
        }),
        new AttributeSchema({
            name: "FrameworkVersion30Path",
            description: `Optional **String** output parameter.\nContains the path to the framework version 3.0 assemblies, if present. Otherwise returns *null*.`
        }),
        new AttributeSchema({
            name: "FrameworkVersion35Path",
            description: `Optional **String** output parameter.\nContains the path to the framework version 3.5 assemblies, if present. Otherwise returns *null*.`
        }),
        new AttributeSchema({
            name: "FrameworkVersion40Path",
            description: `Optional **String** output parameter.\nContains the path to the framework version 4.0 assemblies, if present. Otherwise returns *null*.`
        }),
        new AttributeSchema({
            name: "Path",
            description: `Optional **String** output parameter.\nContains the path to the latest framework assemblies, if any are available. Otherwise returns *null*.`
        })
    ]
});

const getFrameworkSdkPathTaskSchema = new TaskSchema({
    name: "GetFrameworkSdkPath",
    description: `Retrieves the path to the Windows Software Development Kit (SDK).`,
    msdn: `https://msdn.microsoft.com/en-us/library/ms164298.aspx`,
    attributes: [
        new AttributeSchema({
            name: "FrameworkSdkVersion20Path",
            description: `Optional **String** read-only output parameter.\nReturns the path to the .NET SDK version 2.0, if present. Otherwise returns *String.Empty*.`
        }),
        new AttributeSchema({
            name: "FrameworkSdkVersion35Path",
            description: `Optional **String** read-only output parameter.\nReturns the path to the .NET SDK version 3.5, if present. Otherwise returns *String.Empty*.`
        }),
        new AttributeSchema({
            name: "FrameworkSdkVersion40Path",
            description: `Optional **String** read-only output parameter.\nReturns the path to the .NET SDK version 4.0, if present. Otherwise returns *String.Empty*.`
        }),
        new AttributeSchema({
            name: "Path",
            description: `Optional **String** output parameter.\nContains the path to the latest .NET SDK, if any version is present. Otherwise returns *String.Empty*.`
        })
    ]
});

const getReferenceAssemblyPathsTaskSchema = new TaskSchema({
    name: "GetReferenceAssemblyPaths",
    description: `Returns the reference assembly paths of the various frameworks.`,
    msdn: `https://msdn.microsoft.com/en-us/library/ff595159.aspx`,
    attributes: [
        new AttributeSchema({
            name: "ReferenceAssemblyPaths",
            description: `Optional **String[]** output parameter.\nReturns the path, based on the *TargetFrameworkMoniker* parameter. If the *TargetFrameworkMoniker* is *null* or empty, this path will be *String.Empty*.`
        }),
        new AttributeSchema({
            name: "FullFrameworkReferenceAssemblyPaths",
            description: `Optional **String[]** output parameter.\nReturns the path, based on the *TargetFrameworkMoniker* parameter, without considering the profile part of the moniker. If the *TargetFrameworkMoniker* is *null* or empty, this path will be *String.Empty*.`
        }),
        new AttributeSchema({
            name: "TargetFrameworkMoniker",
            description: `Optional **String** parameter.\nSpecifies the target framework moniker that is associated with the reference assembly paths.`
        }),
        new AttributeSchema({
            name: "RootPath",
            description: `Optional **String** parameter.\nSpecifies the root path to use to generate the reference assembly path.`
        }),
        new AttributeSchema({
            name: "BypassFrameworkInstallChecks",
            description: `Optional **Boolean** parameter.\nIf *true*, bypasses the basic checks that *GetReferenceAssemblyPaths* performs by default to ensure that certain runtime frameworks are installed, depending on the target framework.`
        }),
        new AttributeSchema({
            name: "TargetFrameworkMonikerDisplayName",
            description: `Optional **String** output parameter.\nSpecifies the display name for the target framework moniker.`
        })
    ]
});

const lcTaskSchema = new TaskSchema({
    name: "LC",
    description: `Wraps LC.exe, which generates a .license file from a .licx file. For more information on LC.exe, see [Lc.exe (License Compiler)](https://msdn.microsoft.com/en-us/library/ha0k3c9f.aspx).`,
    msdn: `https://msdn.microsoft.com/en-us/library/dya5de84.aspx`,
    attributes: [
        new AttributeSchema({
            name: "LicenseTarget",
            description: `Required **[ITaskItem](https://msdn.microsoft.com/en-us/library/microsoft.build.framework.itaskitem.aspx)** parameter.\nSpecifies the executable for which the .licenses files are generated.`,
            required: true
        }),
        new AttributeSchema({
            name: "NoLogo",
            description: `Optional **Boolean** parameter.\nSuppresses the Microsoft startup banner display.`
        }),
        new AttributeSchema({
            name: "OutputDirectory",
            description: `Optional **String** parameter.\nSpecifies the directory in which to place the output .licenses files.`
        }),
        new AttributeSchema({
            name: "OutputLicense",
            description: `Optional **[ITaskItem](https://msdn.microsoft.com/en-us/library/microsoft.build.framework.itaskitem.aspx)** output parameter.\nSpecifies the name of the .licenses file. If you do not specify a name, the name of the .licx file is used and the .licenses file is placed in the directory that contains the .licx file.`
        }),
        new AttributeSchema({
            name: "ReferencedAssemblies",
            description: `Optional **[ITaskItem](https://msdn.microsoft.com/en-us/library/microsoft.build.framework.itaskitem.aspx)[]** parameter.\nSpecifies the referenced components to load when generating the .license file.`
        }),
        new AttributeSchema({
            name: "SdkToolsPath",
            description: `Optional **String** parameter.\nSpecifies the path to the SDK tools, such as resgen.exe.`
        }),
        new AttributeSchema({
            name: "Sources",
            description: `Required **[ITaskItem](https://msdn.microsoft.com/en-us/library/microsoft.build.framework.itaskitem.aspx)[]** parameter.\nSpecifies the items that contain licensed components to include in the .licenses file. For more information, see the documentation for the */complist* switch in [Lc.exe (License Compiler)](https://msdn.microsoft.com/en-us/library/ha0k3c9f.aspx).`,
            required: true
        })
    ]
});

const libTaskSchema = new TaskSchema({
    name: "LIB",
    description: `Wraps the Microsoft 32-Bit Library Manager tool, lib.exe. The Library Manager creates and manages a library of Common Object File Format (COFF) object files. The Library Manager can also create export files and import libraries to reference exported definitions. For more information, see [LIB Reference](https://msdn.microsoft.com/en-us/library/7ykb2k5f.aspx) and [Running LIB](https://msdn.microsoft.com/en-us/library/h34w59b3.aspx).`,
    msdn: "https://msdn.microsoft.com/en-us/library/ee862484.aspx",
    attributes: [
        new AttributeSchema({
            name: "AdditionalDependencies",
            description: `Optional **String[]** parameter.\nSpecifies additional items to add to the command line.`
        }),
        new AttributeSchema({
            name: "AdditionalLibraryDirectories",
            description: `Optional **String[]** parameter.\nOverrides the environment library path. Specify a directory name.\nFor more information, see [/LIBPATH (Additional Libpath)](https://msdn.microsoft.com/en-us/library/1xhzskbe.aspx).`
        }),
        new AttributeSchema({
            name: "AdditionalOptions",
            description: `Optional **String** parameter.\nA list of lib.exe options as specified on the command line. For example, "*/option1 /option2 /option#*". Use this parameter to specify lib.exe options that are not represented by any other **LIB** task parameter.\nFor more information, see [Running LIB](https://msdn.microsoft.com/en-us/library/h34w59b3.aspx).`
        }),
        new AttributeSchema({
            name: "DisplayLibrary",
            description: `Optional **String** parameter.\nDisplays information about the output library. Specify a file name to redirect the information to a file. Specify "CON" or nothing to redirect the information to the console.\nThis parameter corresponds to the **/LIST** option of lib.exe.`
        }),
        new AttributeSchema({
            name: "ErrorReporting",
            description: `Optional **String** parameter.\nSpecifies how to send internal error information to Microsoft if lib.exe fails at runtime.\nSpecify one of the following values, each of which corresponds to a command-line option.\n- **NoErrorReport** - **/ERRORREPORT:NONE**\n- **PromptImmediately** - **/ERRORREPORT:PROMPT**\n- **QueueForNextLogin** - **/ERRORREPORT:QUEUE**\n- **SendErrorReport** - **/ERRORREPORT:SEND**\n\nFor more information, see the **/ERRORREPORT** command-line option at [Running LIB](https://msdn.microsoft.com/en-us/library/h34w59b3.aspx).`
        }),
        new AttributeSchema({
            name: "ExportNamedFunctions",
            description: `Optional **String[]** parameter.\nSpecifies one or more functions to export.\nThis parameter corresponds to the **/EXPORT:** option of lib.exe.`
        }),
        new AttributeSchema({
            name: "ForceSymbolReferences",
            description: `Optional **String** parameter.\nForces lib.exe to include a reference to the specified symbol.\nThis parameter corresponds to the **/INCLUDE:** option of lib.exe.`
        }),
        new AttributeSchema({
            name: "IgnoreAllDefaultLibraries",
            description: `Optional **Boolean** parameter.\nIf *true*, removes all default libraries from the list of libraries that lib.exe searches when it resolves external references.\nThis parameter corresponds to the parameter-less form of the **/NODEFAULTLIB** option of lib.exe.`
        }),
        new AttributeSchema({
            name: "IgnoreSpecificDefaultLibraries",
            description: `Optional **String[]** parameter.\nRemoves the specified libraries from the list of libraries that lib.exe searches when it resolves external references.\nThis parameter corresponds to the **/NODEFAULTLIB** option of lib.exe that takes a library argument.`
        }),
        new AttributeSchema({
            name: "LinkLibraryDependencies",
            description: `Optional **Boolean** parameter.\nIf *true*, specifies that library outputs from project dependencies are automatically linked in.`
        }),
        new AttributeSchema({
            name: "LinkTimeCodeGeneration",
            description: `Optional **Boolean** parameter.\nIf *true*, specifies link-time code generation.\nThis parameter corresponds to the **/LCTG** option of lib.exe.`
        }),
        new AttributeSchema({
            name: "MinimumRequiredVersion",
            description: `Optional **String** parameter.\nSpecifies the minimum required version of the subsystem. Specify a comma-delimited list of decimal numbers in the range 0 through 65535.`
        }),
        new AttributeSchema({
            name: "ModuleDefinitionFile",
            description: `Optional **String** parameter.\nSpecifies the name of the module-definition file (.def).\nThis parameter corresponds to the **/DEF** option of lib.exe that takes a *filename* argument.`
        }),
        new AttributeSchema({
            name: "Name",
            description: `Optional **String** parameter.\nWhen an import library is built, specifies the name of the DLL for which the import library is being built.\nThis parameter corresponds to the **/NAME** option of lib.exe that takes a *filename* argument.`
        }),
        new AttributeSchema({
            name: "OutputFile",
            description: `Optional **String** parameter.\nOverrides the default name and location of the program that lib.exe creates.\nThis parameter corresponds to the **/OUT** option of lib.exe that takes a *filename* argument.`
        }),
        new AttributeSchema({
            name: "RemoveObjects",
            description: `Optional **String[]** parameter.\nOmits the specified object from the output library. Lib.exe creates an output library by combining all objects (whether in object files or libraries), and then deleting any objects that are specified by this option.\nThis parameter corresponds to the **/REMOVE** option of lib.exe that takes a *membername* argument.`
        }),
        new AttributeSchema({
            name: "Sources",
            description: `Required **[ITaskItem](https://msdn.microsoft.com/en-us/library/microsoft.build.framework.itaskitem.aspx)[]** parameter.\nSpecifies a list of source files separated by spaces.`,
            required: true
        }),
        new AttributeSchema({
            name: "SubSystem",
            description: `Optional **String** parameter.\nSpecifies the environment for the executable. The choice of subsystem affects the entry point symbol or entry point function.\nSpecify one of the following values, each of which corresponds to a command-line option.\n- **Console** - **/SUBSYSTEM:CONSOLE**\n- **Windows** - **/SUBSYSTEM:WINDOWS**\n- **Native** - **/SUBSYSTEM:NATIVE**\n- **EFI Application** - **/SUBSYSTEM:EFI_APPLICATION**\n- **EFI Boot Service Driver** - **/SUBSYSTEM:EFI_BOOT_SERVICE_DRIVER**\n- **EFI ROM** - **/SUBSYSTEM:EFI_ROM**\n- **EFI Runtime** - **/SUBSYSTEM:EFI_RUNTIME_DRIVER**\n- **WindowsCE** - **/SUBSYSTEM:WINDOWSCEReplaceThisText**\n- **POSIX** - **/SUBSYSTEM:POSIX**\n\nFor more information, see [/SUBSYSTEM (Specify Subsystem)](https://msdn.microsoft.com/en-us/library/fcc1zstk.aspx).`
        }),
        new AttributeSchema({
            name: "SuppressStartupBanner",
            description: `Optional **Boolean** parameter.\nIf *true*, prevents the display of the copyright and version number message when the task starts.\nFor more information, see the **/NOLOGO** option at [Running LIB](https://msdn.microsoft.com/en-us/library/h34w59b3.aspx).`
        }),
        new AttributeSchema({
            name: "TargetMachine",
            description: `Optional **String** parameter.\nSpecifies the target platform for the program or DLL.\nSpecify one of the following values, each of which corresponds to a command-line option.\n- **MachineARM** - **/MACHINE:ARM**\n- **MachineEBC** - **/MACHINE:EBC**\n- **MachineIA64** - **/MACHINE:IA64**\n- **MachineMIPS** - **/MACHINE:MIPS**\n- **MachineMIPS16** - **/MACHINE:MIPS16**\n- **MachineMIPSFPU** -**/MACHINE:MIPSFPU**\n- **MachineMIPSFPU16** - **/MACHINE:MIPSFPU16**\n- **MachineSH4** - **/MACHINE:SH4**\n- **MachineTHUMB** - **/MACHINE:THUMB**\n- **MachineX64** - **/MACHINE:X64**\n- **MachineX86** - **/MACHINE:X86**\n\nFor more information, see [/MACHINE (Specify Target Platform)](https://msdn.microsoft.com/en-us/library/5wy54dk2.aspx).`
        }),
        new AttributeSchema({
            name: "TrackerLogDirectory",
            description: `Optional **String** parameter.\nSpecifies the directory of the tracker log.`
        }),
        new AttributeSchema({
            name: "TreatLibWarningAsErrors",
            description: `Optional **Boolean** parameter.\nIf *true*, causes the **LIB** task to not generate an output file if lib.exe generates a warning. If *false*, an output file is generated.\nFor more information, see the **/WX** option at [Running LIB](https://msdn.microsoft.com/en-us/library/h34w59b3.aspx).`
        }),
        new AttributeSchema({
            name: "UseUnicodeResponseFiles",
            description: `Optional **Boolean** parameter.\nIf *true*, instructs the project system to generate UNICODE response files when the librarian is spawned. Specify *true* when files in the project have UNICODE paths.`
        }),
        new AttributeSchema({
            name: "Verbose",
            description: `Optional **Boolean** parameter.\nIf *true*, displays details about the progress of the session; this includes names of the .obj files being added. The information is sent to standard output and can be redirected to a file.\nFor more information, see the **/VERBOSE** option in [Running LIB](https://msdn.microsoft.com/en-us/library/h34w59b3.aspx).`
        })
    ]
});

const linkTaskSchema = new TaskSchema({
    name: "Link",
    description: `Wraps the Visual C++ linker tool, link.exe. The linker tool links Common Object File Format (COFF) object files and libraries to create an executable (.exe) file or a dynamic-link library (DLL). For more information, see [Linker Options](https://msdn.microsoft.com/en-us/library/y0zzbyt4.aspx).`,
    msdn: "https://msdn.microsoft.com/en-us/library/ee862471.aspx",
    attributes: [
        new AttributeSchema({
            name: "AdditionalDependencies",
            description: `Optional **String[]** parameter.\nSpecifies a list of input files to add to the command.\nFor more information, see [LINK Input Files](https://msdn.microsoft.com/en-us/library/hcce369f.aspx).`
        }),
        new AttributeSchema({
            name: "AdditionalLibraryDirectories",
            description: `Optional **String[]** parameter.\nOverrides the environment library path. Specify a directory name.\nFor more information, see [/LIBPATH (Additional Libpath)](https://msdn.microsoft.com/en-us/library/1xhzskbe.aspx).`
        }),
        new AttributeSchema({
            name: "AdditionalManifestDependencies",
            description: `Optional **String[]** parameter.\nSpecifies attributes that will be placed in the *dependency* section of the manifest file.\nFor more information, see [/MANIFESTDEPENDENCY (Specify Manifest Dependencies)](https://msdn.microsoft.com/en-us/library/ew0y5khy.aspx). Also, see "Publisher Configuration Files" on the [MSDN](http://go.microsoft.com/fwlink/?LinkId=737) Web site.`
        }),
        new AttributeSchema({
            name: "AdditionalOptions",
            description: `Optional **String** parameter.\nA list of linker options as specified on the command line. For example, "*/option1 /option2 /option#*". Use this parameter to specify linker options that are not represented by any other **Link** task parameter.\nFor more information, see [Linker Options](https://msdn.microsoft.com/en-us/library/y0zzbyt4.aspx).`
        }),
        new AttributeSchema({
            name: "AddModuleNamesToAssembly",
            description: `Optional **String[]** parameter.\nAdds a module reference to an assembly.\nFor more information, see [/ASSEMBLYMODULE (Add a MSIL Module to the Assembly)](https://msdn.microsoft.com/en-us/library/6de7xtwd.aspx).`
        }),
        new AttributeSchema({
            name: "AllowIsolation",
            description: `Optional **Boolean** parameter.\nIf *true*, causes the operating system to do manifest lookups and loads. If *false*, indicates that DLLs are loaded as if there was no manifest.\nFor more information, see [/ALLOWISOLATION (Manifest Lookup)](https://msdn.microsoft.com/en-us/library/daa1w5yk.aspx).`
        }),
        new AttributeSchema({
            name: "AssemblyDebug",
            description: `Optional **Boolean** parameter.\nIf *true*, emits the **DebuggableAttribute** attribute together with debug information tracking and disables JIT optimizations. If *false*, emits the **DebuggableAttribute** attribute but disables debug information tracking and enables JIT optimizations.\nFor more information, see [/ASSEMBLYDEBUG (Add DebuggableAttribute)](https://msdn.microsoft.com/en-us/library/cta4x5hc.aspx).`
        }),
        new AttributeSchema({
            name: "AssemblyLinkResource",
            description: `Optional **String[]** parameter.\nCreates a link to a .NET Framework resource in the output file; the resource file is not placed in the output file. Specify the name of the resource.\nFor more information, see [/ASSEMBLYLINKRESOURCE (Link to .NET Framework Resource)](https://msdn.microsoft.com/en-us/library/ztd4k98t.aspx).`
        }),
        new AttributeSchema({
            name: "AttributeFileTracking",
            description: `Implicit **Boolean** parameter.\nEnables deeper file tracking to capture link incremental's behavior. Always returns *true*.`
        }),
        new AttributeSchema({
            name: "BaseAddress",
            description: `Optional **String** parameter.\nSets a base address for the program or DLL being built. Specify *{address[,size] | @filename,key}*.\nFor more information, see [/BASE (Base Address)](https://msdn.microsoft.com/en-us/library/f7f5138s.aspx).`
        }),
        new AttributeSchema({
            name: "BuildingInIDE",
            description: `Optional **Boolean** parameter.\nIf *true*, indicates that MSBuild is invoked from the IDE. Otherwise, indicates that MSBuild is invoked from the command line.\nThis parameter has no equivalent linker option.`
        }),
        new AttributeSchema({
            name: "CLRImageType",
            description: `Optional **String** parameter.\nSets the type of a common language runtime (CLR) image.\nSpecify one of the following values, each of which corresponds to a linker option.\n- **Default** - <none>\n- **ForceIJWImage** - **/CLRIMAGETYPE:IJW**\n- **ForcePureILImage** - **/CLRIMAGETYPE:PURE**\n- **ForceSafeILImage** - **/CLRIMAGETYPE:SAFE**\n\nFor more information, see [/CLRIMAGETYPE (Specify Type of CLR Image)](https://msdn.microsoft.com/en-us/library/31zwwc39.aspx).`
        }),
        new AttributeSchema({
            name: "CLRSupportLastError",
            description: `Optional **String** parameter.\nPreserves the last error code of functions called through the P/Invoke mechanism.\nSpecify one of the following values, each of which corresponds to a linker option.\n- **Enabled** - **/CLRSupportLastError**\n- **Disabled** - **/CLRSupportLastError:NO**\n- **SystemDlls** - **/CLRSupportLastError:SYSTEMDLL**\n\nFor more information, see [/CLRSUPPORTLASTERROR (Preserve Last Error Code for PInvoke Calls)](https://msdn.microsoft.com/en-us/library/yy0hww86.aspx).`
        }),
        new AttributeSchema({
            name: "CLRThreadAttribute",
            description: `Optional **String** parameter.\nExplicitly specifies the threading attribute for the entry point of your CLR program.\nSpecify one of the following values, each of which corresponds to a linker option.\n- **DefaultThreadingAttribute** - **/CLRTHREADATTRIBUTE:NONE**\n- **MTAThreadingAttribute** - **/CLRTHREADATTRIBUTE:MTA**\n- **STAThreadingAttribute** - **/CLRTHREADATTRIBUTE:STA**\n\nFor more information, see [/CLRTHREADATTRIBUTE (Set CLR Thread Attribute)](https://msdn.microsoft.com/en-us/library/s6bz81ya.aspx).`
        }),
        new AttributeSchema({
            name: "CLRUnmanagedCodeCheck",
            description: `Optional **Boolean** parameter.\nSpecifies whether the linker will apply **SuppressUnmanagedCodeSecurityAttribute** to linker-generated P/Invoke calls from managed code into native DLLs.\nFor more information, see [/CLRUNMANAGEDCODECHECK (Add SupressUnmanagedCodeSecurityAttribute)](https://msdn.microsoft.com/en-us/library/ms173523.aspx).`
        }),
        new AttributeSchema({
            name: "CreateHotPatchableImage",
            description: `Optional **String** parameter.\nPrepares an image for hot patching.\nSpecify one of the following values, which corresponds to a linker option.\n- **Enabled** - **/FUNCTIONPADMIN**\n- **X86Image** - **/FUNCTIONPADMIN:5**\n- **X64Image** - **/FUNCTIONPADMIN:6**\n- **ItaniumImage** - **/FUNCTIONPADMIN:16**\n\nFor more information, see [/FUNCTIONPADMIN (Create Hotpatchable Image)](https://msdn.microsoft.com/en-us/library/ms173524.aspx).`
        }),
        new AttributeSchema({
            name: "DataExecutionPrevention",
            description: `Optional **Boolean** parameter.\nIf *true*, indicates that an executable was tested to be compatible with the Windows Data Execution Prevention feature.\nFor more information, see [/NXCOMPAT (Compatible with Data Execution Prevention)](https://msdn.microsoft.com/en-us/library/ms235442.aspx).`
        }),
        new AttributeSchema({
            name: "DelayLoadDLLs",
            description: `Optional **String[]** parameter.\nThis parameter causes *delayed loading* of DLLs. Specify the name of a DLL to delay load.\nFor more information, see [/DELAYLOAD (Delay Load Import)](https://msdn.microsoft.com/en-us/library/yx9zd12s.aspx).`
        }),
        new AttributeSchema({
            name: "DelaySign",
            description: `Optional **Boolean** parameter.\bIf *true*, partially signs an assembly. By default, the value is *false*.\nFor more information, see [/DELAYSIGN (Partially Sign an Assembly)](https://msdn.microsoft.com/en-us/library/bk4wd6yz.aspx).`
        }),
        new AttributeSchema({
            name: "Driver",
            description: `Optional **String** parameter.\nSpecify this parameter to build a Windows NT kernel mode driver.\nSpecify one of the following values, each of which corresponds to a linker option.\n- **NotSet** - <none>\n- **Driver** - **/Driver**\n- **UpOnly** - **/DRIVER:UPONLY**\n- **WDM** - **/DRIVER:WDM**\n\nFor more information, see [/DRIVER (Windows NT Kernel Mode Driver)](https://msdn.microsoft.com/en-us/library/43a6z8s4.aspx).`
        }),
        new AttributeSchema({
            name: "EmbedManagedResourceFile",
            description: `Optional **String[]** parameter.\nEmbeds a resource file in an assembly. Specify the required resource file name. Optionally specify the logical name, which is used to load the resource, and the **PRIVATE** option, which indicates in the assembly manifest that the resource file is private.\nFor more information, see [/ASSEMBLYRESOURCE (Embed a Managed Resource)](https://msdn.microsoft.com/en-us/library/yzdy7b10.aspx).`
        }),
        new AttributeSchema({
            name: "EnableCOMDATFolding",
            description: `Optional **Boolean** parameter.\nIf *true*, enables identical COMDAT folding.\nFor more information, see the *ICF[= iterations]* argument of [/OPT (Optimizations)](https://msdn.microsoft.com/en-us/library/bxwfs976.aspx).`
        }),
        new AttributeSchema({
            name: "EnableUAC",
            description: `Optional **Boolean** parameter.\nIf *true*, specifies that User Account Control (UAC) information is embedded in the program manifest.\nFor more information, see [/MANIFESTUAC (Embeds UAC information in manifest)](https://msdn.microsoft.com/en-us/library/bb384691.aspx).`
        }),
        new AttributeSchema({
            name: "EntryPointSymbol",
            description: `Optional **String** parameter.\nSpecifies an entry point function as the starting address for an .exe file or DLL. Specify a function name as the parameter value.\nFor more information, see [/ENTRY (Entry-Point Symbol)](https://msdn.microsoft.com/en-us/library/f9t8842e.aspx).`
        }),
        new AttributeSchema({
            name: "FixedBaseAddress",
            description: `Optional **Boolean** parameter.\nIf *true*, creates a program or DLL that can be loaded only at its preferred base address.\nFor more information, see [/FIXED (Fixed Base Address)](https://msdn.microsoft.com/en-us/library/w368ysh2.aspx).`
        }),
        new AttributeSchema({
            name: "ForceFileOutput",
            description: `Optional **String** parameter.\nTells the linker to create a valid .exe file or DLL even if a symbol is referenced but not defined, or is multiply defined.\nSpecify one of the following values, each of which corresponds to a command-line option.\n- **Enabled** - **/FORCE**\n- **MultiplyDefinedSymbolOnly** - **/FORCE:MULTIPLE**\n- **UndefinedSymbolOnly** - **/FORCE:UNRESOLVED**\n\nFor more information, see [/FORCE (Force File Output)](https://msdn.microsoft.com/en-us/library/70abkas3.aspx).`
        }),
        new AttributeSchema({
            name: "ForceSymbolReferences",
            description: `Optional **String[]** parameter.\nThis parameter tells the linker to add a specified symbol to the symbol table.\nFor more information, see [/INCLUDE (Force Symbol References)](https://msdn.microsoft.com/en-us/library/2s3hwbhs.aspx).`
        }),
        new AttributeSchema({
            name: "FunctionOrder",
            description: `Optional **String** parameter.\nThis parameter optimizes your program by placing the specified packaged functions (COMDATs) into the image in a predetermined order.\nFor more information, see [/ORDER (Put Functions in Order)](https://msdn.microsoft.com/en-us/library/00kh39zz.aspx).`
        }),
        new AttributeSchema({
            name: "GenerateDebugInformation",
            description: `Optional **Boolean** parameter.\nIf *true*, creates debugging information for the .exe file or DLL.\nFor more information, see [/DEBUG (Generate Debug Info)](https://msdn.microsoft.com/en-us/library/xe4t6fc1.aspx).`
        }),
        new AttributeSchema({
            name: "GenerateManifest",
            description: `Optional **Boolean** parameter.\nIf *true*, creates a side-by-side manifest file.\nFor more information, see [/MANIFEST (Create Side-by-Side Assembly Manifest)](https://msdn.microsoft.com/en-us/library/f2c0w594.aspx).`
        }),
        new AttributeSchema({
            name: "GenerateMapFile",
            description: `Optional **Boolean** parameter.\nIf *true*, creates a *map file*. The file name extension of the map file is .map.\nFor more information, see [/MAP (Generate Mapfile)](https://msdn.microsoft.com/en-us/library/k7xkk3e2.aspx).`
        }),
        new AttributeSchema({
            name: "HeapCommitSize",
            description: `Optional **String** parameter.\nSpecifies the amount of physical memory on the heap to allocate at a time.\nFor more information, see the *commit* argument in [/HEAP (Set Heap Size)](https://msdn.microsoft.com/en-us/library/f90ybzkh.aspx). Also, see the **HeapReserveSize** parameter.`
        }),
        new AttributeSchema({
            name: "HeapReserveSize",
            description: `Optional **String** parameter.\nSpecifies the total heap allocation in virtual memory.\nFor more information, see the *reserve* argument in [/HEAP (Set Heap Size)](https://msdn.microsoft.com/en-us/library/f90ybzkh.aspx). Also, see the **HeapCommitSize** parameter in this table.`
        }),
        new AttributeSchema({
            name: "IgnoreAllDefaultLibraries",
            description: `Optional **Boolean** parameter.\nIf *true*, tells the linker to remove one or more default libraries from the list of libraries it searches when it resolves external references.\nFor more information, see [/NODEFAULTLIB (Ignore Libraries)](https://msdn.microsoft.com/en-us/library/3tz4da4a.aspx).`
        }),
        new AttributeSchema({
            name: "IgnoreEmbeddedIDL",
            description: `Optional **Boolean** parameter.\nIf *true*, specifies that any IDL attributes in source code should not be processed into an .idl file.\nFor more information, see [/IGNOREIDL (Don't Process Attributes into MIDL)](https://msdn.microsoft.com/en-us/library/f2bt983c.aspx).`
        }),
        new AttributeSchema({
            name: "IgnoreImportLibrary",
            description: `Optional **Boolean** parameter.\nIf *true*, specifies that the import library generated by this configuration should not be imported into dependent projects.\nThis parameter does not correspond to a linker option.`
        }),
        new AttributeSchema({
            name: "IgnoreSpecificDefaultLibraries",
            description: `Optional **String[]** parameter.\nSpecifies one or more names of default libraries to ignore. Separate multiple libraries by using semi-colons.\nFor more information, see [/NODEFAULTLIB (Ignore Libraries)](https://msdn.microsoft.com/en-us/library/3tz4da4a.aspx).`
        }),
        new AttributeSchema({
            name: "ImageHasSafeExceptionHandlers",
            description: `Optional **Boolean** parameter.\nIf *true*, the linker produces an image only if it can also produce a table of the image's safe exception handlers.\nFor more information, see [/SAFESEH (Image has Safe Exception Handlers)](https://msdn.microsoft.com/en-us/library/9a89h429.aspx).`
        }),
        new AttributeSchema({
            name: "ImportLibrary",
            description: `A user-specified import library name that replaces the default library name.\nFor more information, see [/IMPLIB (Name Import Library)](https://msdn.microsoft.com/en-us/library/67wc07b9.aspx).`
        }),
        new AttributeSchema({
            name: "KeyContainer",
            description: `Optional **String** parameter.\nContainer that contains the key for a signed assembly.\nFor more information, see [/KEYCONTAINER (Specify a Key Container to Sign an Assembly)](https://msdn.microsoft.com/en-us/library/5k6bd8t1.aspx). Also, see the **KeyFile** parameter.`
        }),
        new AttributeSchema({
            name: "KeyFile",
            description: `Optional **String** parameter.\nSpecifies a file that contains the key for a signed assembly.\nFor more information, see [/KEYFILE (Specify Key or Key Pair to Sign an Assembly)](https://msdn.microsoft.com/en-us/library/x730hw3t.aspx). Also, see the **KeyContainer** parameter.`
        }),
        new AttributeSchema({
            name: "LargeAddressAware",
            description: `Optional **Boolean** parameter.\nIf *true*, the application can handle addresses larger than 2 gigabytes.\nFor more information, see [/LARGEADDRESSAWARE (Handle Large Addresses)](https://msdn.microsoft.com/en-us/library/wz223b1z.aspx).`
        }),
        new AttributeSchema({
            name: "LinkDLL",
            description: `Optional **Boolean** parameter.\nIf *true*, builds a DLL as the main output file.\nFor more information, see [/DLL (Build a DLL)](https://msdn.microsoft.com/en-us/library/527z7zfs.aspx).`
        }),
        new AttributeSchema({
            name: "LinkErrorReporting",
            description: `Optional **String** parameter.\nLets you provide internal compiler error (ICE) information directly to Microsoft.\nSpecify one of the following values, each of which corresponds to a command-line option.\n- **NoErrorReport** - **/ERRORREPORT:NONE**\n- **PromptImmediately** - **/ERRORREPORT:PROMPT**\n- **QueueForNextLogin** - **/ERRORREPORT:QUEUE**\n- **SendErrorReport** - **/ERRORREPORT:SEND**\n\nFor more information, see [/ERRORREPORT (Report Internal Linker Errors)](https://msdn.microsoft.com/en-us/library/ms235602.aspx).`
        }),
        new AttributeSchema({
            name: "LinkIncremental",
            description: `Optional **Boolean** parameter.\nIf *true*, enables incremental linking.\nFor more information, see [/INCREMENTAL (Link Incrementally)](https://msdn.microsoft.com/en-us/library/4khtbfyf.aspx).`
        }),
        new AttributeSchema({
            name: "LinkLibraryDependencies",
            description: `Optional **Boolean** parameter.\nIf *true*, specifies that library outputs from project dependencies are automatically linked in.\nThis parameter does not correspond to a linker option.`
        }),
        new AttributeSchema({
            name: "LinkStatus",
            description: `Optional **Boolean** parameter.\nIf *true*, specifies that the linker is to display a progress indicator that shows what percentage of the link is complete.\nFor more information, see the *STATUS* argument of [/LTCG (Link-time Code Generation)](https://msdn.microsoft.com/en-us/library/xbf3tbeh.aspx).`
        }),
        new AttributeSchema({
            name: "LinkTimeCodeGeneration",
            description: `Optional **String** parameter.\nSpecifies options for profile-guided optimization.\nSpecify one of the following values, each of which corresponds to a command-line option.\n- **Default** - <none>\n- **UseLinkTimeCodeGeneration** - **/LTCG**\n- **PGInstrument** - **/LTCG:PGInstrument**\n- **PGOptimization** - **/LTCG:PGOptimize**\n- **PGUpdate** - **/LTCG:PGUpdate**\n\nFor more information, see [/LTCG (Link-time Code Generation)](https://msdn.microsoft.com/en-us/library/xbf3tbeh.aspx).`
        }),
        new AttributeSchema({
            name: "ManifestFile",
            description: `Optional **String** parameter.\nChanges the default manifest file name to the specified file name.\nFor more information, see [/MANIFESTFILE (Name Manifest File)](https://msdn.microsoft.com/en-us/library/fft52235.aspx).`
        }),
        new AttributeSchema({
            name: "MapExports",
            description: `Optional **Boolean** parameter.\nIf *true*, tells the linker to include exported functions in a map file.\nFor more information, see the *EXPORTS* argument of [/MAPINFO (Include Information in Mapfile)](https://msdn.microsoft.com/en-us/library/bha0yc3d.aspx).`
        }),
        new AttributeSchema({
            name: "MapFileName",
            description: `Optional **String** parameter.\nChanges the default map file name to the specified file name.`
        }),
        new AttributeSchema({
            name: "MergedIDLBaseFileName",
            description: `Optional **String** parameter.\nSpecifies the file name and file name extension of the .idl file.\nFor more information, see [/IDLOUT (Name MIDL Output Files)](https://msdn.microsoft.com/en-us/library/cf540x82.aspx).`
        }),
        new AttributeSchema({
            name: "MergeSections",
            description: `Optional **String** parameter.\nCombines sections in an image. Specify *from-section=to-section*.\nFor more information, see [/MERGE (Combine Sections)](https://msdn.microsoft.com/en-us/library/wxz26dz2.aspx).`
        }),
        new AttributeSchema({
            name: "MidlCommandFile",
            description: `Optional **String** parameter.\nSpecify the name of a file that contains MIDL command-line options.\nFor more information, see [/MIDL (Specify MIDL Command Line Options)](https://msdn.microsoft.com/en-us/library/9kae41s3.aspx).`
        }),
        new AttributeSchema({
            name: "MinimumRequiredVersion",
            description: `Optional **String** parameter.\nSpecifies the minimum required version of the subsystem. The arguments are decimal numbers in the range 0 through 65535.`
        }),
        new AttributeSchema({
            name: "ModuleDefinitionFile",
            description: `Optional **String** parameter.\nSpecifies the name of a [module definition file](https://msdn.microsoft.com/en-us/library/28d6s79h.aspx).\nFor more information, see [/DEF (Specify Module-Definition File)](https://msdn.microsoft.com/en-us/library/34c30xs1.aspx).`
        }),
        new AttributeSchema({
            name: "MSDOSStubFileName",
            description: `Optional **String** parameter.\nAttaches the specified MS-DOS stub program to a Win32 program.\nFor more information, see [/STUB (MS-DOS Stub File Name)](https://msdn.microsoft.com/en-us/library/7z0585h5.aspx).`
        }),
        new AttributeSchema({
            name: "NoEntryPoint",
            description: `Optional **Boolean** parameter.\nIf *true*, specifies a resource-only DLL.\nFor more information, see [/NOENTRY (No Entry Point)](https://msdn.microsoft.com/en-us/library/8ys34d7t.aspx).`
        }),
        new AttributeSchema({
            name: "ObjectFiles",
            description: `Implicit **String[]** parameter.\nSpecifies the object files that are linked.`
        }),
        new AttributeSchema({
            name: "OptimizeReferences",
            description: `Optional **Boolean** parameter.\nIf *true*, eliminates functions and/or data that are never referenced.\nFor more information, see the *REF* argument in [/OPT (Optimizations)](https://msdn.microsoft.com/en-us/library/bxwfs976.aspx).`
        }),
        new AttributeSchema({
            name: "OutputFile",
            description: `Optional **String** parameter.\nOverrides the default name and location of the program that the linker creates.\nFor more information, see [/OUT (Output File Name)](https://msdn.microsoft.com/en-us/library/8htcy933.aspx).`
        }),
        new AttributeSchema({
            name: "PerUserRedirection",
            description: `Optional **Boolean** parameter.\nIf *true* and Register Output is enabled, forces registry writes to **HKEY_CLASSES_ROOT** to be redirected to **HKEY_CURRENT_USER**.`
        }),
        new AttributeSchema({
            name: "PreprocessOutput",
            description: `Optional **[ITaskItem](https://msdn.microsoft.com/en-us/library/microsoft.build.framework.itaskitem.aspx)[]** parameter.\nDefines an array of preprocessor output items that can be consumed and emitted by tasks.`
        }),
        new AttributeSchema({
            name: "PreventDllBinding",
            description: `Optional **Boolean** parameter.\nIf *true*, indicates to Bind.exe that the linked image should not be bound.\nFor more information, see [/ALLOWBIND (Prevent DLL Binding)](https://msdn.microsoft.com/en-us/library/hsa130k8.aspx).`
        }),
        new AttributeSchema({
            name: "Profile",
            description: `Optional **Boolean** parameter.\nIf *true*, produces an output file that can be used with the U*Performance Tools** profiler.\nFor more information, see [/PROFILE (Performance Tools Profiler)](https://msdn.microsoft.com/en-us/library/ays5x7b0.aspx).`
        }),
        new AttributeSchema({
            name: "ProfileGuidedDatabase",
            description: `Optional **String** parameter.\nSpecifies the name of the .pgd file that will be used to hold information about the running program.\nFor more information, see [/PGD (Specify Database for Profile-Guided Optimizations)](https://msdn.microsoft.com/en-us/library/438sd1tf.aspx).`
        }),
        new AttributeSchema({
            name: "ProgramDatabaseFile",
            description: `Optional **String** parameter.\nSpecifies a name for the program database (PDB) that the linker creates.\nFor more information, see [/PDB (Use Program Database)](https://msdn.microsoft.com/en-us/library/kwx19e36.aspx).`
        }),
        new AttributeSchema({
            name: "RandomizedBaseAddress",
            description: `Optional **Boolean** parameter.\nIf *true*, generates an executable image that can be randomly rebased at load time by using the *address space layout randomization* (ASLR) feature of Windows.\nFor more information, see [/DYNAMICBASE (Use address space layout randomization)](https://msdn.microsoft.com/en-us/library/bb384887.aspx).`
        }),
        new AttributeSchema({
            name: "RegisterOutput",
            description: `Optional **Boolean** parameter.\nIf *true*, registers the primary output of this build.`
        }),
        new AttributeSchema({
            name: "SectionAlignment",
            description: `Optional **Integer** parameter.\nSpecifies the alignment of each section within the linear address space of the program. The parameter value is a unit number of bytes and is a power of two.\nFor more information, see [/ALIGN (Section Alignment)](https://msdn.microsoft.com/en-us/library/8xx65e1y.aspx).`
        }),
        new AttributeSchema({
            name: "SetChecksum",
            description: `Optional **Boolean** parameter.\nIf *true*, sets the checksum in the header of an .exe file.\nFor more information, see [/RELEASE (Set the Checksum)](https://msdn.microsoft.com/en-us/library/h8ksa72a.aspx).`
        }),
        new AttributeSchema({
            name: "ShowProgress",
            description: `Optional **String** parameter.\nSpecifies the verbosity of progress reports for the linking operation.\nSpecify one of the following values, each of which corresponds to a command-line option.\n- **NotSet** - <none>\n- **LinkVerbose** - **/VERBOSE**\n- **LinkVerboseLib** - **/VERBOSE:Lib**\n- **LinkVerboseICF** - **/VERBOSE:ICF**\n- **LinkVerboseREF** - **/VERBOSE:REF**\n- **LinkVerboseSAFESEH** - **/VERBOSE:SAFESEH**\n- **LinkVerboseCLR** - **/VERBOSE:CLR**\n\nFor more information, see [/VERBOSE (Print Progress Messages)](https://msdn.microsoft.com/en-us/library/wdsk6as6.aspx).`
        }),
        new AttributeSchema({
            name: "Sources",
            description: `Required **[ITaskItem](https://msdn.microsoft.com/en-us/library/microsoft.build.framework.itaskitem.aspx)[]** parameter.\nDefines an array of MSBuild source file items that can be consumed and emitted by tasks.`,
            required: true
        }),
        new AttributeSchema({
            name: "SpecifySectionAttributes",
            description: `Optional **String** parameter.\nSpecifies the attributes of a section. This overrides the attributes that were set when the .obj file for the section was compiled.\nFor more information, see [/SECTION (Specify Section Attributes)](https://msdn.microsoft.com/en-us/library/sf9b18xk.aspx).`
        }),
        new AttributeSchema({
            name: "StackCommitSize",
            description: `Optional **String** parameter.\nSpecifies the amount of physical memory in each allocation when additional memory is allocated.\nFor more information, see the *commit* argument of [/STACK (Stack Allocations)](https://msdn.microsoft.com/en-us/library/8cxs58a6.aspx).`
        }),
        new AttributeSchema({
            name: "StackReserveSize",
            description: `Optional **String** parameter.\nSpecifies the total stack allocation size in virtual memory.\nFor more information, see the *reserve* argument of [/STACK (Stack Allocations)](https://msdn.microsoft.com/en-us/library/8cxs58a6.aspx).`
        }),
        new AttributeSchema({
            name: "StripPrivateSymbols",
            description: `Optional **String** parameter.\nCreates a second program database (PDB) file that omits symbols that you do not want to distribute to your customers. Specify the name of the second PDB file.\nFor more information, see [/PDBSTRIPPED (Strip Private Symbols)](https://msdn.microsoft.com/en-us/library/y87kw2fd.aspx).`
        }),
        new AttributeSchema({
            name: "SubSystem",
            description: `Optional **String** parameter.\nSpecifies the environment for the executable.\nSpecify one of the following values, each of which corresponds to a command-line option.\n- **NotSet** - <none>\n- **Console** - **/SUBSYSTEM:CONSOLE**\n- **Windows** - **/SUBSYSTEM:WINDOWS**\n- **Native** - **/SUBSYSTEM:NATIVE**\n- **EFI Application** - **/SUBSYSTEM:EFI_APPLICATION**\n- **EFI Boot Service Driver** - **/SUBSYSTEM:EFI_BOOT_SERVICE_DRIVER**\n- **EFI ROM** - **/SUBSYSTEM:EFI_ROM**\n- **EFI Runtime** - **/SUBSYSTEM:EFI_RUNTIME_DRIVER**\n- **WindowsCE** - **/SUBSYSTEM:WINDOWSCE**\n- **POSIX** - **/SUBSYSTEM:POSIX**\n\nFor more information, see [/SUBSYSTEM (Specify Subsystem)](https://msdn.microsoft.com/en-us/library/fcc1zstk.aspx).`
        }),
        new AttributeSchema({
            name: "SupportNobindOfDelayLoadedDLL",
            description: `Optional **Boolean** parameter.\nIf *true*, tells the linker not to include a bindable Import Address Table (IAT) in the final image.\nFor more information, see the *NOBIND* argument of [/DELAY (Delay Load Import Settings)](https://msdn.microsoft.com/en-us/library/hdx9xk46.aspx).`
        }),
        new AttributeSchema({
            name: "SupportUnloadOfDelayLoadedDLL",
            description: `Optional **Boolean** parameter.\nIf *true*, tells the delay-load helper function to support explicit unloading of the DLL.\nFor more information, see the *UNLOAD* argument of [/DELAY (Delay Load Import Settings)](https://msdn.microsoft.com/en-us/library/hdx9xk46.aspx).`
        }),
        new AttributeSchema({
            name: "SuppressStartupBanner",
            description: `Optional **Boolean** parameter.\nIf *true*, prevents the display of the copyright and version number message when the task starts.\nFor more information, see [/NOLOGO (Suppress Startup Banner) (Linker)](https://msdn.microsoft.com/en-us/library/ef4d60dk.aspx).`
        }),
        new AttributeSchema({
            name: "SwapRunFromCD",
            description: `Optional **Boolean** parameter.\nIf *true*, tells the operating system to first copy the linker output to a swap file, and then run the image from there.\nFor more information, see the *CD* argument of [/SWAPRUN (Load Linker Output to Swap File)](https://msdn.microsoft.com/en-us/library/chzz5ts6.aspx). Also, see the **SwapRunFromNET** parameter.`
        }),
        new AttributeSchema({
            name: "SwapRunFromNET",
            description: `Optional **Boolean** parameter.\nIf *true*, tells the operating system to first copy the linker output to a swap file, and then run the image from there.\nFor more information, see the *NET* argument of [/SWAPRUN (Load Linker Output to Swap File)](https://msdn.microsoft.com/en-us/library/chzz5ts6.aspx). Also, see the **SwapRunFromCD** parameter.`
        }),
        new AttributeSchema({
            name: "TargetMachine",
            description: `Optional **String** parameter.\nSpecifies the target platform for the program or DLL.\nSpecify one of the following values, each of which corresponds to a command-line option.\n- **NotSet** - *<none>*\n- **MachineARM** - **/MACHINE:ARM**\n- **MachineEBC** - **/MACHINE:EBC**\n- **MachineIA64** - **/MACHINE:IA64**\n- **MachineMIPS** - **/MACHINE:MIPS**\n- **MachineMIPS16** - **/MACHINE:MIPS16**\n- **MachineMIPSFPU** - **/MACHINE:MIPSFPU**\n- **MachineMIPSFPU16** - **/MACHINE:MIPSFPU16**\n- **MachineSH4** - **/MACHINE:SH4**\n- **MachineTHUMB** - **/MACHINE:THUMB**\n- **MachineX64** - **/MACHINE:X64**\n- **MachineX86** - **/MACHINE:X86**\n\nFor more information, see [/MACHINE (Specify Target Platform)](https://msdn.microsoft.com/en-us/library/5wy54dk2.aspx).`
        }),
        new AttributeSchema({
            name: "TerminalServerAware",
            description: `Optional **Boolean** parameter.\nIf *true*, sets a flag in the IMAGE_OPTIONAL_HEADER DllCharacteristics field in the program image's optional header. When this flag is set, Terminal Server will not make certain changes to the application.\nFor more information, see [/TSAWARE (Create Terminal Server Aware Application)](https://msdn.microsoft.com/en-us/library/01cfys9z.aspx).`
        }),
        new AttributeSchema({
            name: "TrackerLogDirectory",
            description: `Optional **String** parameter.\nSpecifies the directory of the tracker log.`
        }),
        new AttributeSchema({
            name: "TreatLinkerWarningAsErrors",
            description: `Optional **Boolean** parameter.\nIf *true*, causes no output file to be generated if the linker generates a warning.\nFor more information, see [/WX (Treat Linker Warnings as Errors)](https://msdn.microsoft.com/en-us/library/ms235592.aspx).`
        }),
        new AttributeSchema({
            name: "TurnOffAssemblyGeneration",
            description: `Optional **Boolean** parameter.\nIf *true*, creates an image for the current output file without a .NET Framework assembly.\nFor more information, see [/NOASSEMBLY (Create a MSIL Module)](https://msdn.microsoft.com/en-us/library/df0y9bww.aspx).`
        }),
        new AttributeSchema({
            name: "TypeLibraryFile",
            description: `Optional **String** parameter.\nSpecifies the file name and file name extension of the .tlb file. Specify a file name, or a path and file name.\nFor more information, see [/TLBOUT (Name .TLB File)](https://msdn.microsoft.com/en-us/library/439ahd3s.aspx).`
        }),
        new AttributeSchema({
            name: "TypeLibraryResourceID",
            description: `Optional **Integer** parameter.\nDesignates a user-specified value for a linker-created type library. Specify a value from 1 through 65535.\nFor more information, see [/TLBID (Specify Resource ID for TypeLib)](https://msdn.microsoft.com/en-us/library/b1kw34cb.aspx).`
        }),
        new AttributeSchema({
            name: "UACExecutionLevel",
            description: `Optional **String** parameter.\nSpecifies the requested execution level for the application when it is run under with User Account Control.\nSpecify one of the following values, each of which corresponds to a command-line option.\n- **AsInvoker** - *level='asInvoker'*\n- **HighestAvailable** - *level='highestAvailable'*\n- **RequireAdministrator** - *level='requireAdministrator'*\n\nFor more information, see the level argument of [/MANIFESTUAC (Embeds UAC information in manifest)](https://msdn.microsoft.com/en-us/library/bb384691.aspx).`
        }),
        new AttributeSchema({
            name: "UACUIAccess",
            description: `Optional **Boolean** parameter.\nIf *true*, the application bypasses user interface protection levels and drives input to higher-permission windows on the desktop; otherwise, *false*.\nFor more information, see the *uiAccess* argument of [/MANIFESTUAC (Embeds UAC information in manifest)](https://msdn.microsoft.com/en-us/library/bb384691.aspx).`
        }),
        new AttributeSchema({
            name: "UseLibraryDependencyInputs",
            description: `Optional **Boolean** parameter.\nIf *true*, the inputs to the librarian tool are used rather than the library file itself when library outputs of project dependencies are linked in.`
        }),
        new AttributeSchema({
            name: "Version",
            description: `Optional **String** parameter.\nPut a version number in the header of the .exe or .dll file. Specify *"major[.minor]"*. The *major* and *minor* arguments are decimal numbers from 0 through 65535.\nFor more information, see [/VERSION (Version Information)](https://msdn.microsoft.com/en-us/library/h88b7dc8.aspx).`
        })
    ]
});

const makeDirTaskSchema = new TaskSchema({
    name: "MakeDir",
    description: `Creates directories and, if necessary, any parent directories.`,
    msdn: "https://msdn.microsoft.com/en-us/library/s2448zz7.aspx",
    attributes: [
        new AttributeSchema({
            name: "Directories",
            description: `Required **[ITaskItem](https://msdn.microsoft.com/en-us/library/microsoft.build.framework.itaskitem.aspx)[]** parameter.\nThe set of directories to create.`,
            required: true
        }),
        new AttributeSchema({
            name: "DirectoriesCreated",
            description: `Optional **[ITaskItem](https://msdn.microsoft.com/en-us/library/microsoft.build.framework.itaskitem.aspx)[]** output parameter.\nThe directories that are created by this task. If some directories could not be created, this may not contain all of the items that were passed into the **Directories** parameter.`
        })
    ]
});

const messageTaskSchema = new TaskSchema({
    name: "Message",
    description: `Logs a message during a build.\nThe *Message* task allows MSBuild projects to issue messages to loggers at different steps in the build process.\nIf the *Condition* parameter evaluates to *true*, the value of the *Text* parameter will be logged and the build will continue to execute. If a *Condition* parameter does not exist, the message text is logged. For more information on logging, see [Obtaining Build Logs](https://msdn.microsoft.com/en-us/library/ms171470.aspx).\nBy default, the message is sent to the MSBuild console logger. This can be changed by setting the [Log](https://msdn.microsoft.com/en-us/library/microsoft.build.tasks.taskextension.log.aspx) parameter. The logger interprets the *Importance* parameter.`,
    msdn: "https://msdn.microsoft.com/en-us/library/6yy0yx8d.aspx",
    attributes: [
        new AttributeSchema({
            name: "Importance",
            description: `Optional **String** parameter.\nSpecifies the importance of the message. This parameter can have a value of *high*, *normal*, or *low*. The default value is *normal*.`
        }),
        new AttributeSchema({
            name: "Text",
            description: `Optional **String** parameter.\nThe error text to log.`
        })
    ]
});

const midlTaskSchema = new TaskSchema({
    name: "MIDL",
    description: `Wraps the Microsoft Interface Definition Language (MIDL) compiler tool, midl.exe. For more information, see "MIDL Command-Line Reference" on the [MSDN](http://go.microsoft.com/fwlink/?LinkId=737) Web site.`,
    msdn: "https://msdn.microsoft.com/en-us/library/ee862478.aspx",
    attributes: [
        new AttributeSchema({
            name: "AdditionalIncludeDirectories",
            description: `Optional **String[]** parameter.\nAdds a directory to the list of directories that are searched for imported IDL files, included header files, and application configuration files (ACF).\nFor more information, see the **/I** option in "MIDL Command-Line Reference" on the [MSDN](http://go.microsoft.com/fwlink/?LinkId=737) Web site.`
        }),
        new AttributeSchema({
            name: "AdditionalOptions",
            description: `Optional **String** parameter.\nA list of command-line options. For example, "*/option1 /option2 /option#*". Use this parameter to specify command-line options that are not represented by any other MIDL task parameter.\nFor more information, see "MIDL Command-Line Reference" on the [MSDN](http://go.microsoft.com/fwlink/?LinkId=737) Web site.`
        }),
        new AttributeSchema({
            name: "ApplicationConfigurationMode",
            description: `Optional **Boolean** parameter.\nIf *true*, lets you use some ACF keywords in the IDL file.\nFor more information, see the **/app_config** option in "MIDL Command-Line Reference" on the [MSDN](http://go.microsoft.com/fwlink/?LinkId=737) Web site.`
        }),
        new AttributeSchema({
            name: "ClientStubFile",
            description: `Optional **String** parameter.\nSpecifies the name of the client stub file for an RPC interface.\nFor more information, see the **/cstub** option in "MIDL Command-Line Reference" on the [MSDN](http://go.microsoft.com/fwlink/?LinkId=737) Web site. Also see the **ServerStubFile** parameter.`
        }),
        new AttributeSchema({
            name: "CPreprocessOptions",
            description: `Optional **String** parameter.\nSpecifies options to pass to the C/C++ preprocessor. Specify a space-delimited list of preprocessor options.\nFor more information, see the **/cpp_opt** option in "MIDL Command-Line Reference" on the [MSDN](http://go.microsoft.com/fwlink/?LinkId=737) Web site.`
        }),
        new AttributeSchema({
            name: "DefaultCharType",
            description: `Optional **String** parameter.\nSpecifies the default character type that the C compiler will use to compile the generated code.\nSpecify one of the following values, each of which corresponds to a command-line option.\n- **Signed** - **/char signed**\n- **Unsigned** - **/char unsigned**\n- **Ascii** - **/char ascii7**\nFor more information, see the **/char** option in "MIDL Command-Line Reference" on the [MSDN](http://go.microsoft.com/fwlink/?LinkId=737) Web site.`
        }),
        new AttributeSchema({
            name: "DllDataFileName",
            description: `Optional **String** parameter.\nSpecifies the file name for the generated *dlldata* file for a proxy DLL.\nFor more information, see the **/dlldata** option in "MIDL Command-Line Reference" on the [MSDN](http://go.microsoft.com/fwlink/?LinkId=737) Web site.`
        }),
        new AttributeSchema({
            name: "EnableErrorChecks",
            description: `Optional **String** parameter.\nSpecifies the type of error checking that the generated stubs will perform at run time.\nSpecify one of the following values, each of which corresponds to a command-line option.\n- **None** - **/error none**\n- **EnableCustom** - **/error**\n- **All** - **/error all**\n\nFor more information, see the **/error** option in "MIDL Command-Line Reference" on the [MSDN](http://go.microsoft.com/fwlink/?LinkId=737) Web site.`
        }),
        new AttributeSchema({
            name: "ErrorCheckAllocations",
            description: `Optional **Boolean** parameter.\nIf *true*, check for out-of-memory errors.\nFor more information, see the **/error** allocation option in "MIDL Command-Line Reference" on the [MSDN](http://go.microsoft.com/fwlink/?LinkId=737) Web site.`
        }),
        new AttributeSchema({
            name: "ErrorCheckBounds",
            description: `Optional **Boolean** parameter.\nIf *true*, checks the size of conformant-varying and varying arrays against the transmission length specification.\nFor more information, see the **/error bounds_check** option in "MIDL Command-Line Reference" on the [MSDN](http://go.microsoft.com/fwlink/?LinkId=737) Web site.`
        }),
        new AttributeSchema({
            name: "ErrorCheckEnumRange",
            description: `Optional **Boolean** parameter.\nIf *true*, checks that enum values are in an allowable range.\nFor more information, see the **/error enum** option in command-line help (**/?**) for midl.exe.`
        }),
        new AttributeSchema({
            name: "ErrorCheckRefPointers",
            description: `Optional **Boolean** parameter.\nIf *true*, check that no null reference pointers are passed to client stubs.\nFor more information, see the **/error ref** option in "MIDL Command-Line Reference" on the [MSDN](http://go.microsoft.com/fwlink/?LinkId=737) Web site.`
        }),
        new AttributeSchema({
            name: "ErrorCheckStubData",
            description: `Optional **Boolean** parameter.\nIf *true*, generates a stub that catches unmarshaling exceptions on the server side and propagates them back to the client.\nFor more information, see the **/error stub_data** option in "MIDL Command-Line Reference" on the [MSDN](http://go.microsoft.com/fwlink/?LinkId=737) Web site.`
        }),
        new AttributeSchema({
            name: "GenerateClientFiles",
            description: `Optional **String** parameter.\nSpecifies whether the compiler generates client-side C source files for an RPC interface.\nSpecify one of the following values, each of which corresponds to a command-line option.\n- **None** - **/client none**\n- **Stub** - **/client stub**\n\nFor more information, see the **/client** option in "MIDL Command-Line Reference" on the [MSDN](http://go.microsoft.com/fwlink/?LinkId=737) Web site.`
        }),
        new AttributeSchema({
            name: "GenerateServerFiles",
            description: `Optional **String** parameter.\nSpecifies whether the compiler generates server-side C source files for an RPC interface.\nSpecify one of the following values, each of which corresponds to a command-line option.\n- **None** - **/server none**\n- **Stub** - **/server stub**\n\nFor more information, see the **/server** option in "MIDL Command-Line Reference" on the [MSDN](http://go.microsoft.com/fwlink/?LinkId=737) Web site.`
        }),
        new AttributeSchema({
            name: "GenerateStublessProxies",
            description: `Optional **Boolean** parameter.\nIf *true*, generates fully interpreted stubs together with stubless proxies for object interfaces.\nFor more information, see the **/Oicf** option in "MIDL Command-Line Reference" on the [MSDN](http://go.microsoft.com/fwlink/?LinkId=737) Web site.`
        }),
        new AttributeSchema({
            name: "GenerateTypeLibrary",
            description: `Optional **Boolean** parameter.\nIf *true*, a type library (.tlb) file is not generated.\nFor more information, see the **/notlb** option in "MIDL Command-Line Reference" on the [MSDN](http://go.microsoft.com/fwlink/?LinkId=737) Web site.`
        }),
        new AttributeSchema({
            name: "HeaderFileName",
            description: `Optional **String** parameter.\nSpecifies the name of the generated header file.\nFor more information, see the **/h** or **/header** option in "MIDL Command-Line Reference" on the [MSDN](http://go.microsoft.com/fwlink/?LinkId=737) Web site.`
        }),
        new AttributeSchema({
            name: "IgnoreStandardIncludePath",
            description: `Optional **Boolean** parameter.\nIf *true*, the MIDL task searches only the directories specified by using the **AdditionalIncludeDirectories** switch, and ignores the current directory and the directories specified by the INCLUDE environment variable.\nFor more information, see the **/no_def_idir** option in "MIDL Command-Line Reference" on the [MSDN](http://go.microsoft.com/fwlink/?LinkId=737) Web site.`
        }),
        new AttributeSchema({
            name: "InterfaceIdentifierFileName",
            description: `Optional **String** parameter.\nSpecifies the name of the *interface identifier file* for a COM interface. This overrides the default name obtained by adding "_i.c" to the IDL file name.\nFor more information, see the **/iid** option in "MIDL Command-Line Reference" on the [MSDN](http://go.microsoft.com/fwlink/?LinkId=737) Web site.`
        }),
        new AttributeSchema({
            name: "LocaleID",
            description: `Optional **int** parameter.\nSpecifies the *locale identifier* that enables the use of international characters in input files, file names, and directory paths. Specify a decimal locale identifier.\nFor more information, see the **/lcid** option in "MIDL Command-Line Reference" on the [MSDN](http://go.microsoft.com/fwlink/?LinkId=737) Web site. Also see "Locale IDs Assigned by Microsoft" at MSDN.`
        }),
        new AttributeSchema({
            name: "MkTypLibCompatible",
            description: `Optional **Boolean** parameter.\nIf *true*, requires the format of the input file to be compatible with mktyplib.exe version 2.03.\nFor more information, see the **/mktyplib203** option in "MIDL Command-Line Reference" on the [MSDN](http://go.microsoft.com/fwlink/?LinkId=737) Web site. Also, see "ODL File Syntax" on the MSDN Web site.`
        }),
        new AttributeSchema({
            name: "OutputDirectory",
            description: `Optional **String** parameter.\nSpecifies the default directory where the MIDL task writes output files.\nFor more information, see the **/out** option in "MIDL Command-Line Reference" on the [MSDN](http://go.microsoft.com/fwlink/?LinkId=737) Web site.`
        }),
        new AttributeSchema({
            name: "PreprocessorDefinitions",
            description: `Optional **String[]** parameter.\nSpecifies one or more **defines**; that is, a name and an optional value to be passed to the C preprocessor as if by a *#define* directive. The form of each define is, *name[=value]*.\nFor more information, see the **/D** option in "MIDL Command-Line Reference" on the [MSDN](http://go.microsoft.com/fwlink/?LinkId=737) Web site. Also, see the **UndefinePreprocessorDefinitions** parameter.`
        }),
        new AttributeSchema({
            name: "ProxyFileName",
            description: `Optional **String** parameter.\nSpecifies the name of the interface proxy file for a COM interface.\nFor more information, see the **/proxy** option in "MIDL Command-Line Reference" on the [MSDN](http://go.microsoft.com/fwlink/?LinkId=737) Web site.`
        }),
        new AttributeSchema({
            name: "RedirectOutputAndErrors",
            description: `Optional **String** parameter.\nRedirects output, such as error messages and warnings, from standard output to the specified file.\nFor more information, see the **/o** option in "MIDL Command-Line Reference" on the [MSDN](http://go.microsoft.com/fwlink/?LinkId=737) Web site.`
        }),
        new AttributeSchema({
            name: "ServerStubFile",
            description: `Optional **String** parameter.\nSpecifies the name of the server stub file for an RPC interface.\nFor more information, see the **/sstub** option in "MIDL Command-Line Reference" on the [MSDN](http://go.microsoft.com/fwlink/?LinkId=737) Web site. Also, see the **ClientStubFile** parameter.`
        }),
        new AttributeSchema({
            name: "Source",
            description: `Required **[ITaskItem](https://msdn.microsoft.com/en-us/library/microsoft.build.framework.itaskitem.aspx)[]** parameter.\nSpecifies a list of source files separated by spaces.`,
            required: true
        }),
        new AttributeSchema({
            name: "StructMemberAlignment",
            description: `Optional **String** parameter.\nSpecifies the alignment (*packing level*) of structures in the target system.\nSpecify one of the following values, each of which corresponds to a command-line option.\n- **NotSet** - <none>\n- **1** - **/Zp1**\n- **2** - **/Zp2**\n- **4** - **/Zp4**\n- **8** - **/Zp8**\n\nFor more information, see the **/Zp** option in "MIDL Command-Line Reference" on the [MSDN](http://go.microsoft.com/fwlink/?LinkId=737) Web site. The **/Zp** option is equivalent to the **/pack** option and the older **/align** option.`
        }),
        new AttributeSchema({
            name: "SuppressCompilerWarnings",
            description: `Optional **Boolean** parameter.\nIf *true*, suppresses warning messages from the MIDL task.\nFor more information, see the **/no_warn** option in "MIDL Command-Line Reference" on the [MSDN](http://go.microsoft.com/fwlink/?LinkId=737) Web site.`
        }),
        new AttributeSchema({
            name: "SuppressStartupBanner",
            description: `Optional **Boolean** parameter.\nIf *true*, prevents the display of the copyright and version number message when the task starts.\nFor more information, see the **/nologo** option in "MIDL Command-Line Reference" on the [MSDN](http://go.microsoft.com/fwlink/?LinkId=737) Web site.`
        }),
        new AttributeSchema({
            name: "TargetEnvironment",
            description: `Optional **String** parameter.\nSpecifies the environment in which the application runs.\nSpecify one of the following values, each of which corresponds to a command-line option.\n- **NotSet** - <none>\n- **Win32** - **/env win32**\n- **Itanium** - **/env ia64**\n- **X64** - **/env x64**\n\nFor more information, see the **/env** option in "MIDL Command-Line Reference" on the [MSDN](http://go.microsoft.com/fwlink/?LinkId=737) Web site.`
        }),
        new AttributeSchema({
            name: "TrackerLogDirectory",
            description: `Optional **String** parameter.\nSpecifies the intermediate directory where tracking logs for this task are stored.`
        }),
        new AttributeSchema({
            name: "TypeLibFormat",
            description: `Optional **String** parameter.\nSpecifies the format of the type library file.\nSpecify one of the following values, each of which corresponds to a command-line option.\n- **NewFormat** - **/newtlb**\n- **OldFormat** - **/oldtlb**\n\nFor more information, see the **/newtlb** and **/oldtlb** options in "MIDL Command-Line Reference" on the [MSDN](http://go.microsoft.com/fwlink/?LinkId=737) Web site.`
        }),
        new AttributeSchema({
            name: "TypeLibraryName",
            description: `Optional **String** parameter.\nSpecifies the name of the type library file.\nFor more information, see the **/tlb** option in "MIDL Command-Line Reference" on the [MSDN](http://go.microsoft.com/fwlink/?LinkId=737) Web site.`
        }),
        new AttributeSchema({
            name: "UndefinePreprocessorDefinitions",
            description: `Optional **String[]** parameter.\nRemoves any previous definition of a name by passing the name to the C preprocessor as if by a *#undefine* directive. Specify one or more previously defined names.\nFor more information, see the **/U** option in "MIDL Command-Line Reference" on the [MSDN](http://go.microsoft.com/fwlink/?LinkId=737) Web site. Also, see the **PreprocessorDefinitions** parameter.`
        }),
        new AttributeSchema({
            name: "ValidateAllParameters",
            description: `Optional **Boolean** parameter.\nIf *true*, generates additional error-checking information that is used to perform integrity checks at run time. If *false*, the error-checking information is not generated.\nFor more information, see the **/robust** and **/no_robust options** in "MIDL Command-Line Reference" on the [MSDN](http://go.microsoft.com/fwlink/?LinkId=737) Web site.`
        }),
        new AttributeSchema({
            name: "WarnAsError",
            description: `Optional **Boolean** parameter.\nIf *true*, treats all warnings as errors.\nIf the **WarningLevel** MIDL task parameter is not specified, warnings at the default level, level 1, are treated as errors.\nFor more information, see the **/WX** options in "MIDL Command-Line Reference" on the [MSDN](http://go.microsoft.com/fwlink/?LinkId=737) Web site. Also, see the WarningLevel parameter.`
        }),
        new AttributeSchema({
            name: "WarningLevel",
            description: `Optional **String** parameter.\nSpecifies the severity (*warning level*) of warnings to emit. No warning is emitted for a value of 0. Otherwise, a warning is emitted if its warning level is numerically less than or equal to the specified value.\nSpecify one of the following values, each of which corresponds to a command-line option.\n- **0** - **/W0**\n- **1** - **/W1**\n- **2** - **/W2**\n- **3** - **/W3**\n- **4** - **/W4**\n\nFor more information, see the **/W** option in "MIDL Command-Line Reference" on the [MSDN](http://go.microsoft.com/fwlink/?LinkId=737) Web site. Also, see the **WarnAsError** parameter.`
        })
    ]
});

const moveTaskSchema = new TaskSchema({
    name: "Move",
    description: `Moves files to a new location.\nEither the DestinationFolder parameter or the DestinationFiles parameter must be specified, but not both. If both are specified, the task fails and an error is logged.`,
    msdn: "https://msdn.microsoft.com/en-us/library/ff595163.aspx",
    attributes: [
        new AttributeSchema({
            name: "DestinationFiles",
            description: `Optional **[ITaskItem](https://msdn.microsoft.com/en-us/library/microsoft.build.framework.itaskitem.aspx)[]** output parameter.\nSpecifies the list of files to move the source files to. This list is expected to be a one-to-one mapping to the list that is specified in the *SourceFiles* parameter. That is, the first file specified in *SourceFiles* will be moved to the first location specified in *DestinationFiles*, and so forth.`,
            required: true,
            notWith: "DestinationFolder"
        }),
        new AttributeSchema({
            name: "DestinationFolder",
            description: `Optional **[ITaskItem](https://msdn.microsoft.com/en-us/library/microsoft.build.framework.itaskitem.aspx)** parameter.\nSpecifies the directory to which you want to move the files.`,
            required: true,
            notWith: "DestinationFiles"
        }),
        new AttributeSchema({
            name: "MovedFiles",
            description: `Optional **[ITaskItem](https://msdn.microsoft.com/en-us/library/microsoft.build.framework.itaskitem.aspx)[]** output parameter.\nContains the items that were successfully moved.`
        }),
        new AttributeSchema({
            name: "OverwriteReadOnlyFiles",
            description: `Optional **Boolean** parameter.\nIf *true*, overwrites files even if they are marked as read-only files.`
        }),
        new AttributeSchema({
            name: "SourceFiles",
            description: `Required **[ITaskItem](https://msdn.microsoft.com/en-us/library/microsoft.build.framework.itaskitem.aspx)[]** parameter.\nSpecifies the files to move.`,
            required: true
        })
    ]
});

const msbuildTaskSchema = new TaskSchema({
    name: "MSBuild",
    description: `Builds MSBuild projects from another MSBuild project.`,
    msdn: "https://msdn.microsoft.com/en-us/library/z7f65y0d.aspx",
    attributes: [
        new AttributeSchema({
            name: "BuildInParallel",
            description: `Optional **Boolean** parameter.\nIf *true*, the projects specified in the *Projects* parameter are built in parallel if it is possible. Default is *false*.`
        }),
        new AttributeSchema({
            name: "Projects",
            description: `Required **[ITaskItem](https://msdn.microsoft.com/en-us/library/microsoft.build.framework.itaskitem.aspx)[]** parameter.\nSpecifies the project files to build.`,
            required: true
        }),
        new AttributeSchema({
            name: "Properties",
            description: `Optional **String** parameter.\nA semicolon-delimited list of property name/value pairs to apply as global properties to the child project. When you specify this parameter, it is functionally equivalent to setting properties that have the **/property** switch when you build with MSBuild.exe. For example:\n"*Properties="Configuration=Debug;Optimize=$(Optimize)*"\nWhen you pass properties to the project through the *Properties* parameter, MSBuild creates a new instance of the project even if the project file has already been loaded. When a new instance of the project has been created, MSBuild treats it as a different project that has different global properties and that can be built in parallel with other instances of the project. For example, a Release configuration could build at the same time as a Debug configuration.`
        }),
        new AttributeSchema({
            name: "RebaseOutputs",
            description: `Optional **Boolean** parameter.\nIf *true*, the relative paths of target output items from the built projects have their paths adjusted to be relative to the calling project. Default is false.`
        }),
        new AttributeSchema({
            name: "RemoveProperties",
            description: `Optional **String** parameter.\nSpecifies the set of global properties to remove.`
        }),
        new AttributeSchema({
            name: "RunEachTargetSeparately",
            description: `Optional **Boolean** parameter.\nIf *true*, the MSBuild task invokes each target in the list passed to MSBuild one at a time, instead of at the same time. Setting this parameter to *true* guarantees that subsequent targets are invoked even if previously invoked targets failed. Otherwise, a build error would stop invocation of all subsequent targets. Default is *false*.`
        }),
        new AttributeSchema({
            name: "SkipNonexistentProjects",
            description: `Optional **Boolean** parameter.\nIf *true*, project files that do not exist on the disk will be skipped. Otherwise, such projects will cause an error.`
        }),
        new AttributeSchema({
            name: "StopOnFirstFailure",
            description: `Optional **Boolean** parameter.\nIf *true*, when one of the projects fails to build, no more projects will be built. Currently this is not supported when building in parallel (with multiple processors).`
        }),
        new AttributeSchema({
            name: "TargetAndPropertyListSeparators",
            description: `Optional **String[]** parameter.\nSpecifies a list of targets and properties as *Project* item metadata). Separators will be un-escaped before processing. e.g. %3B (an escaped ';') will be treated as if it were an un-escaped ';'.`
        }),
        new AttributeSchema({
            name: "TargetOutputs",
            description: `Optional **[ITaskItem](https://msdn.microsoft.com/en-us/library/microsoft.build.framework.itaskitem.aspx)[]** read-only output parameter.\nReturns the outputs of the built targets from all the project files. Only the outputs from the targets that were specified are returned, not any outputs that may exist on targets that those targets depend on.\nThe *TargetOutputs* parameter also contains the following metadata:\n- *MSBuildSourceProjectFile*: The MSBuild project file that contains the target that set the outputs.\n- *MSBuildSourceTargetName*: The target that set the outputs. **Note:** If you want to identify the outputs from each project file or target separately, run the *MSBuild* task separately for each project file or target. If you run the *MSBuild* task only once to build all the project files, the outputs of all the targets are collected into one array.`
        }),
        new AttributeSchema({
            name: "Targets",
            description: `Optional **String** parameter.\nSpecifies the target or targets to build in the project files. Use a semicolon to separate a list of target names. If no targets are specified in the *MSBuild* task, the default targets specified in the project files are built. **Note:** The targets must occur in all the project files. If they do not, a build error occurs.`
        }),
        new AttributeSchema({
            name: "ToolsVersion",
            description: `Optional **String** parameter.\nSpecifies the *ToolsVersion* to use when building projects passed to this task.\nEnables an MSBuild task to build a project that targets a different version of the .NET Framework than the one specified in the project. Valid values are *2.0*, *3.0* and *3.5*. Default value is *3.5*.`
        }),
        new AttributeSchema({
            name: "UnloadProjectsOnCompletion",
            description: `Optional **Boolean** parameter.\nIf *true*, the project will be unloaded once the operation is complete.`
        }),
        new AttributeSchema({
            name: "UseResultsCache",
            description: `Optional **Boolean** parameter.\nIf *true*, the cached result will be returned, if present. If theMSBuild task is run, its result will be cached in a scope (ProjectFileName, GlobalProperties)[TargetNames] as a list of build items.`
        })
    ]
});

const mtTaskSchema = new TaskSchema({
    name: "MT",
    description: `Wraps the Microsoft Manifest Tool, mt.exe. For more information, see "Mt.exe" on the MSDN Web site.`,
    msdn: "https://msdn.microsoft.com/en-us/library/ee862482.aspx",
    attributes: [
        new AttributeSchema({
            name: "AdditionalManifestFiles",
            description: `Optional **String[]** parameter.\nSpecifies the name of one or more manifest files.\nFor more information, see the **/manifest** option in "Mt.exe" on the [MSDN](http://go.microsoft.com/fwlink/?LinkId=737) Web site.`
        }),
        new AttributeSchema({
            name: "AdditionalOptions",
            description: `Optional **String** parameter.\nA list of command-line options. For example, "*/option1 /option2 /option#*". Use this parameter to specify command-line options that are not represented by any other **MT** task parameter.\nFor more information, see "Mt.exe" on the [MSDN](http://go.microsoft.com/fwlink/?LinkId=737) Web site.`
        }),
        new AttributeSchema({
            name: "AssemblyIdentity",
            description: `Optional **String** parameter.\nSpecifies the attribute values of the **assemblyIdentity** element of the manifest. Specify a comma-delimited list, where the first component is the value of the *name* attribute, followed by one or more name/value pairs that have the form, *<attribute name>=<attribute_value>*.\nFor more information, see the **/identity** option in "Mt.exe" on the [MSDN](http://go.microsoft.com/fwlink/?LinkId=737) Web site.`
        }),
        new AttributeSchema({
            name: "ComponentFileName",
            description: `Optional **String** parameter.\nSpecifies the name of the dynamic-link library you intend to build from the .rgs or .tlb files. This parameter is required if you specify the **RegistrarScriptFile** or **TypeLibraryFile** MT task parameters.\nFor more information, see the **/dll** option in "Mt.exe" on the [MSDN](http://go.microsoft.com/fwlink/?LinkId=737) Web site.`
        }),
        new AttributeSchema({
            name: "DependencyInformationFile",
            description: `Optional **String** parameter.\nSpecifies the dependency information file used by Visual Studio to track build dependency information for the manifest tool.`
        }),
        new AttributeSchema({
            name: "EmbedManifest",
            description: `Optional **Boolean** parameter.\nIf *true*, embeds the manifest file in the assembly. If *false*, creates as a stand-alone manifest file.`
        }),
        new AttributeSchema({
            name: "EnableDPIAwareness",
            description: `Optional **Boolean** parameter.\nIf *true*, adds to the manifest information that marks the application as DPI-aware. Writing a DPI-aware application makes a user interface look consistently good across a wide variety of high-DPI display settings.\nFor more information, see "High DPI" on the [MSDN](http://go.microsoft.com/fwlink/?LinkId=737) Web site.`
        }),
        new AttributeSchema({
            name: "GenerateCatalogFiles",
            description: `Optional **Boolean** parameter.\nIf *true*, generates catalog definition (.cdf) files.\nFor more information, see the **/makecdfs** option in "Mt.exe" on the [MSDN](http://go.microsoft.com/fwlink/?LinkId=737) Web site.`
        }),
        new AttributeSchema({
            name: "GenerateCategoryTags",
            description: `Optional **Boolean** parameter.\nIf *true*, causes category tags to be generated. If this parameter is *true*, the **ManifestFromManagedAssemblyMT** task parameter must also be specified.\nFor more information, see the **/category** option in "Mt.exe" on the [MSDN](http://go.microsoft.com/fwlink/?LinkId=737) Web site.`
        }),
        new AttributeSchema({
            name: "InputResourceManifests",
            description: `Optional **String** parameter.\nInput the manifest from a resource of type RT_MANIFEST that has the specified identifier. Specify a resource of the form, *<file>[;[#]<resource_id>]*, where the optional *resource_id* parameter is a non-negative, 16-bit number.\nIf no *resource_id* is specified, the CREATEPROCESS_MANIFEST_RESOURCE default value (1) is used.\nFor more information, see the **/inputresource** option in "Mt.exe" on the [MSDN](http://go.microsoft.com/fwlink/?LinkId=737) Web site.`
        }),
        new AttributeSchema({
            name: "ManifestFromManagedAssembly",
            description: `Optional **String** parameter.\nGenerates a manifest from the specified managed assembly.\nFor more information, see the **/managedassemblyname** option in "Mt.exe" on the [MSDN](http://go.microsoft.com/fwlink/?LinkId=737) Web site.`
        }),
        new AttributeSchema({
            name: "ManifestToIgnore",
            description: `Optional **String** parameter.\n(Not used.)`
        }),
        new AttributeSchema({
            name: "OutputManifestFile",
            description: `Optional **String** parameter.\nSpecifies the name of the output manifest. If this parameter is omitted and only one manifest is being operated on, that manifest is modified in place.\nFor more information, see the **/out** option in "Mt.exe" on the [MSDN](http://go.microsoft.com/fwlink/?LinkId=737) Web site.`
        }),
        new AttributeSchema({
            name: "OutputResourceManifests",
            description: `Optional **String** parameter.\nOutput the manifest to a resource of type RT_MANIFEST that has the specified identifier. The resource is of the form, *<file>[;[#]<resource_id>]*, where the optional *resource_id* parameter is a non-negative, 16-bit number.\nIf no *resource_id* is specified, the CREATEPROCESS_MANIFEST_RESOURCE default value (1) is used.\nFor more information, see the **/outputresource** option in "Mt.exe" on the [MSDN](http://go.microsoft.com/fwlink/?LinkId=737) Web site.`
        }),
        new AttributeSchema({
            name: "RegistrarScriptFile",
            description: `Optional **String** parameter.\nSpecifies the name of the registrar script (.rgs) file to use for registration-free COM manifest support.\nFor more information, see the **/rgs** option in "Mt.exe" on the [MSDN](http://go.microsoft.com/fwlink/?LinkId=737) Web site.`
        }),
        new AttributeSchema({
            name: "ReplacementsFile",
            description: `Optional **String** parameter.\nSpecifies the file that contains values for the replaceable strings in the registrar script (.rgs) file.\nFor more information, see the **/replacements** option in "Mt.exe" on the [MSDN](http://go.microsoft.com/fwlink/?LinkId=737) Web site.`
        }),
        new AttributeSchema({
            name: "ResourceOutputFileName",
            description: `Optional **String** parameter.\nSpecifies the output resources file used to embed the manifest into the project output.`
        }),
        new AttributeSchema({
            name: "Sources",
            description: `Optional **[ITaskItem](https://msdn.microsoft.com/en-us/library/microsoft.build.framework.itaskitem.aspx)[]** parameter.\nSpecifies a list of manifest source files separated by spaces.\nFor more information, see the **/manifest** option in "Mt.exe" on the [MSDN](http://go.microsoft.com/fwlink/?LinkId=737) Web site.`
        }),
        new AttributeSchema({
            name: "SuppressDependencyElement",
            description: `Optional **Boolean** parameter.\nIf *true*, generates a manifest without dependency elements. If this parameter is *true*, also specify the **ManifestFromManagedAssemblyMT** task parameter.\nFor more information, see the **/nodependency** option in "Mt.exe" on the [MSDN](http://go.microsoft.com/fwlink/?LinkId=737) Web site.`
        }),
        new AttributeSchema({
            name: "SuppressStartupBanner",
            description: `Optional **Boolean** parameter.\nIf *true*, prevents the display of the copyright and version number message when the task starts.\nFor more information, see the **/nologo** option in "Mt.exe" on the [MSDN](http://go.microsoft.com/fwlink/?LinkId=737) Web site.`
        }),
        new AttributeSchema({
            name: "TrackerLogDirectory",
            description: `Optional **String** parameter.\nSpecifies the intermediate directory where tracking logs for this task are stored.`
        }),
        new AttributeSchema({
            name: "TypeLibraryFile",
            description: `Optional **String** parameter.\nSpecifies the name of the type library (.tlb) file. If you specify this parameter, also specify the **ComponentFileNameMT** task parameter.\nFor more information, see the **/tlb** option in "Mt.exe" on the [MSDN](http://go.microsoft.com/fwlink/?LinkId=737) Web site.`
        }),
        new AttributeSchema({
            name: "UpdateFileHashes",
            description: `Optional **Boolean** parameter.\nIf *true*, computes the hash value of the files at the path specified by the **UpdateFileHashesSearchPathMT** task parameter, and then updates the value of the **hash** attribute of the **file** element of the manifest by using the computed value.\nFor more information, see the **/hashupdate** option in "Mt.exe" on the [MSDN](http://go.microsoft.com/fwlink/?LinkId=737) Web site. Also see the **UpdateFileHashesSearchPath** parameter.`
        }),
        new AttributeSchema({
            name: "UpdateFileHashesSearchPath",
            description: `Optional **String** parameter.\nSpecifies the search path to use when the file hashes are updated. Use this parameter with the **UpdateFileHashesMT** task parameter.\nFor more information, see the **UpdateFileHashes** parameter.`
        }),
        new AttributeSchema({
            name: "VerboseOutput",
            description: `Optional **Boolean** parameter.\nIf *true*, displays verbose debugging information.\nFor more information, see the **/verbose** option in "Mt.exe" on the [MSDN](http://go.microsoft.com/fwlink/?LinkId=737) Web site.`
        })
    ]
});

const rcTaskSchema = new TaskSchema({
    name: "RC",
    description: `Wraps the Microsoft Windows Resource Compiler tool, rc.exe. The **RC** task compiles resources, such as cursors, icons, bitmaps, dialog boxes, and fonts, into a resource (.res) file. For more information, see "Resource Compiler" on the [MSDN](http://go.microsoft.com/fwlink/?LinkId=737) Web site.`,
    msdn: "https://msdn.microsoft.com/en-us/library/ee862475.aspx",
    attributes: [
        new AttributeSchema({
            name: "AdditionalIncludeDirectories",
            description: `Optional **String[]** parameter.\nAdds a directory to the list of directories that are searched for include files.\nFor more information, see the **/I** option in [Using RC (The RC Command Line)](http://go.microsoft.com/fwlink/?LinkId=155730) on the MSDN Web site.`
        }),
        new AttributeSchema({
            name: "AdditionalOptions",
            description: `Optional String parameter.\nA list of command-line optionsor example, "*/option1 /option2 /option#*". Use this parameter to specify command-line options that are not represented by any other **RC** task parameter.\nFor more information, see the options in [Using RC (The RC Command Line)](http://go.microsoft.com/fwlink/?LinkId=155730) on the MSDN Web site.`
        }),
        new AttributeSchema({
            name: "Culture",
            description: `Optional **String** parameter.\nSpecifies a locale ID that represents the culture used in the resources.\nFor more information, see the **/l** option in [Using RC (The RC Command Line)](http://go.microsoft.com/fwlink/?LinkId=155730) on the MSDN Web site.`
        }),
        new AttributeSchema({
            name: "IgnoreStandardIncludePath",
            description: `Optional **Boolean** parameter.\nIf *true*, prevents the resource compiler from checking the INCLUDE environment variable when it searches for header files or resource files.\nFor more information, see the **/x** option in [Using RC (The RC Command Line)](http://go.microsoft.com/fwlink/?LinkId=155730) on the MSDN Web site.`
        }),
        new AttributeSchema({
            name: "NullTerminateStrings",
            description: `Optional **Boolean** parameter.\nIf *true*, null-terminates all strings in the string table.\nFor more information, see the **/n** option in [Using RC (The RC Command Line)](http://go.microsoft.com/fwlink/?LinkId=155730) on the MSDN Web site.`
        }),
        new AttributeSchema({
            name: "PreprocessorDefinitions",
            description: `Optional **String[]** parameter.\nDefine one or more preprocessor symbols for the resource compiler. Specify a list of macro symbols.\nFor more information, see the **/d** option in [Using RC (The RC Command Line)](http://go.microsoft.com/fwlink/?LinkId=155730) on the MSDN Web site. Also see **UndefinePreprocessorDefinitions**.`
        }),
        new AttributeSchema({
            name: "ResourceOutputFileName",
            description: `Optional **String** parameter.\nSpecifies the name of the resource file. Specify a resource file name.\nFor more information, see the **/fo** option in [Using RC (The RC Command Line)](http://go.microsoft.com/fwlink/?LinkId=155730) on the MSDN Web site.`
        }),
        new AttributeSchema({
            name: "ShowProgress",
            description: `Optional **Boolean** parameter.\nIf *true*, displays messages that report on the progress of the compiler.\nFor more information, see the **/v** option in [Using RC (The RC Command Line)](http://go.microsoft.com/fwlink/?LinkId=155730) on the MSDN Web site.`
        }),
        new AttributeSchema({
            name: "Source",
            description: `Required **[ITaskItem](https://msdn.microsoft.com/en-us/library/microsoft.build.framework.itaskitem.aspx)[]** parameter.\nDefines an array of MSBuild source file items that can be consumed and emitted by tasks.`,
            required: true
        }),
        new AttributeSchema({
            name: "SuppressStartupBanner",
            description: `Optional **Boolean** parameter.\nIf *true*, prevents the display of the copyright and version number message when the task starts.\nFor more information, type the **/?** command-line option and then see the **/nologo** option.`
        }),
        new AttributeSchema({
            name: "TrackerLogDirectory",
            description: `Optional **String** parameter.\nSpecifies the tracker log directory.`
        }),
        new AttributeSchema({
            name: "UndefinePreprocessorDefinitions",
            description: `Undefine a preprocessor symbol.\nFor more information, see the **/u** option in [Using RC (The RC Command Line)](http://go.microsoft.com/fwlink/?LinkId=155730) on the MSDN Web site. Also see **PreprocessorDefinitions**.`
        })
    ]
});

const readLinesFromFileTaskSchema = new TaskSchema({
    name: "ReadLinesFromFile",
    description: `Reads a list of items from a text file.`,
    msdn: "https://msdn.microsoft.com/en-us/library/ms164299.aspx",
    attributes: [
        new AttributeSchema({
            name: "File",
            description: `Required **[ITaskItem](https://msdn.microsoft.com/en-us/library/microsoft.build.framework.itaskitem.aspx)** parameter.\nSpecifies the file to read. The file must have one item on each line.`,
            required: true
        }),
        new AttributeSchema({
            name: "Lines",
            description: `Optional **[ITaskItem](https://msdn.microsoft.com/en-us/library/microsoft.build.framework.itaskitem.aspx)[]** output parameter.\nContains the lines read from the file.`
        })
    ]
});

const registerAssemblyTaskSchema = new TaskSchema({
    name: "RegisterAssembly",
    description: `Reads the metadata within the specified assembly and adds the necessary entries to the registry, which allows COM clients to create .NET Framework classes transparently. The behavior of this task is similar, but not identical, to that of the [Regasm.exe (Assembly Registration Tool)](https://msdn.microsoft.com/en-us/library/tzat5yw6.aspx).`,
    msdn: "https://msdn.microsoft.com/en-us/library/dakwb8wf.aspx",
    attributes: [
        new AttributeSchema({
            name: "Assemblies",
            description: `Required **[ITaskItem](https://msdn.microsoft.com/en-us/library/microsoft.build.framework.itaskitem.aspx)[]** parameter.\nSpecifies the assemblies to be registered with COM.`,
            required: true
        }),
        new AttributeSchema({
            name: "AssemblyListFile",
            description: `Optional **[ITaskItem](https://msdn.microsoft.com/en-us/library/microsoft.build.framework.itaskitem.aspx)** parameter.\nContains information about the state between the *RegisterAssembly* task and the [UnregisterAssembly](https://msdn.microsoft.com/en-us/library/a8d5b2y5.aspx) task. This prevents the *UnregisterAssembly* task from attempting to unregister an assembly that failed to register in the *RegisterAssembly* task.`
        }),
        new AttributeSchema({
            name: "CreateCodeBase",
            description: `Optional **Boolean** parameter.\nIf *true*, creates a codebase entry in the registry, which specifies the file path for an assembly that is not installed in the global assembly cache. You should not specify this option if you will subsequently install the assembly that you are registering into the global assembly cache.`
        }),
        new AttributeSchema({
            name: "TypeLibFiles",
            description: `Optional **[ITaskItem](https://msdn.microsoft.com/en-us/library/microsoft.build.framework.itaskitem.aspx)[]** output parameter.\nSpecifies the type library to generate from the specified assembly. The generated type library contains definitions of the accessible types defined within the assembly. The type library is only generated if one of the following is true:\n- A type library of that name does not exist at that location.\n- A type library exists but it is older than the assembly being passed in.\n\nIf the type library is newer than the assembly being passed, a new one will not be created, but the assembly will still be registered.\nIf this parameter is specified, it must have the same number of items as the *Assemblies* parameter or the task will fail. If no inputs are specified, the task will default to the name of the assembly and change the extension of the item to .tlb.`
        })
    ]
});

const removeDirTaskSchema = new TaskSchema({
    name: "RemoveDir",
    description: `Removes the specified directories and all of its files and subdirectories.`,
    msdn: "https://msdn.microsoft.com/en-us/library/xyfz6ddb.aspx",
    attributes: [
        new AttributeSchema({
            name: "Directories",
            description: `Required **[ITaskItem](https://msdn.microsoft.com/en-us/library/microsoft.build.framework.itaskitem.aspx)[]** parameter.\nSpecifies the directories to delete.`,
            required: true
        }),
        new AttributeSchema({
            name: "RemovedDirectories",
            description: `Optional **[ITaskItem](https://msdn.microsoft.com/en-us/library/microsoft.build.framework.itaskitem.aspx)[]** output parameter.\nContains the directories that were successfully deleted.`
        })
    ]
});

const removeDuplicatesTaskSchema = new TaskSchema({
    name: "RemoveDuplicates",
    description: `Removes duplicate items from the specified item collection.`,
    msdn: "https://msdn.microsoft.com/en-us/library/ms164300.aspx",
    attributes: [
        new AttributeSchema({
            name: "Filtered",
            description: `Optional **[ITaskItem](https://msdn.microsoft.com/en-us/library/microsoft.build.framework.itaskitem.aspx)[]** output parameter.\nContains an item collection with all duplicate items removed.`
        }),
        new AttributeSchema({
            name: "Inputs",
            description: `Optional **[ITaskItem](https://msdn.microsoft.com/en-us/library/microsoft.build.framework.itaskitem.aspx)[]** parameter.\nThe item collection to remove duplicate items from.`
        })
    ]
});

const requiresFramework35SP1AssemblyTaskSchema = new TaskSchema({
    name: "RequiresFramework35SP1Assembly",
    description: `Determines whether the application requires the .NET Framework 3.5 SP1.`,
    msdn: "https://msdn.microsoft.com/en-us/library/ff598689.aspx",
    attributes: [
        new AttributeSchema({
            name: "Assemblies",
            description: `Optional **[ITaskItem](https://msdn.microsoft.com/en-us/library/microsoft.build.framework.itaskitem.aspx)[]** parameter.\nSpecifies the assemblies that are referenced in the application.`
        }),
        new AttributeSchema({
            name: "CreateDesktopShortcut",
            description: `Optional **Boolean** parameter.\nIf *true*, creates a shortcut icon on the desktop during installation.`
        }),
        new AttributeSchema({
            name: "DeploymentManifestEntryPoint",
            description: `Optional **[ITaskItem](https://msdn.microsoft.com/en-us/library/microsoft.build.framework.itaskitem.aspx)** parameter.\nSpecifies the manifest file name for the application.`
        }),
        new AttributeSchema({
            name: "EntryPoint",
            description: `Optional **[ITaskItem](https://msdn.microsoft.com/en-us/library/microsoft.build.framework.itaskitem.aspx)** parameter.\nSpecifies the assembly that should be executed when the application is run.`
        }),
        new AttributeSchema({
            name: "ErrorReportUrl",
            description: `Optional **String** parameter.\nSpecifies the Web site that is displayed in dialog boxes that are encountered during ClickOnce installations.`
        }),
        new AttributeSchema({
            name: "Files",
            description: `Optional **[ITaskItem](https://msdn.microsoft.com/en-us/library/microsoft.build.framework.itaskitem.aspx)[]** parameter.\nSpecifies the list of files that will be deployed when the application is published.`
        }),
        new AttributeSchema({
            name: "ReferencedAssemblies",
            description: `Optional **[ITaskItem](https://msdn.microsoft.com/en-us/library/microsoft.build.framework.itaskitem.aspx)[]** parameter.\nSpecifies the assemblies that are referenced in the project.`
        }),
        new AttributeSchema({
            name: "RequiresMinimumFramework35SP1",
            description: `Optional **Boolean** output parameter.\nIf *true*, the application requires the .NET Framework 3.5 SP1.`
        }),
        new AttributeSchema({
            name: "SigningManifests",
            description: `Optional **Boolean** output parameter.\nIf *true*, the ClickOnce manifests are signed.`
        }),
        new AttributeSchema({
            name: "SuiteName",
            description: `Optional **String** parameter.\nSpecifies the name of the folder on the **Start** menu in which the application will be installed.`
        }),
        new AttributeSchema({
            name: "TargetFrameworkVersion",
            description: `Optional **String** parameter.\nSpecifies the version of the .NET Framework that this application targets.`
        })
    ]
});

const resolveAssemblyReferenceTaskSchema = new TaskSchema({
    name: "ResolveAssemblyReference",
    description: `Determines all assemblies that depend on the specified assemblies. This includes second and *n*th-order dependencies.`,
    msdn: "https://msdn.microsoft.com/en-us/library/9ad3f294.aspx",
    attributes: [
        new AttributeSchema({
            name: "AllowedAssemblyExtensions",
            description: `Optional **String[]** parameter.\nThe assembly file name extensions to use when resolving references. The default file name extensions are .exe and .dll.`
        }),
        new AttributeSchema({
            name: "AllowedRelatedFileExtensions",
            description: `Optional **String[]** parameter.\nThe file name extensions to use for a search for files that are related to one another. The default extensions are .pdb and .xml.`
        }),
        new AttributeSchema({
            name: "AppConfigFile",
            description: `Optional **String** parameter.\nSpecifies an app.config file from which to parse and extract bindingRedirect mappings. If this parameter is specified, the *AutoUnify* parameter must be *false*.`
        }),
        new AttributeSchema({
            name: "AutoUnify",
            description: `Optional **Boolean** parameter.\nThis parameter is used for building assemblies, such as DLLs, which cannot have a normal App.Config file.\nWhen *true*, the resulting dependency graph is automatically treated as if there were anApp.Config file passed in to the AppConfigFile parameter. This virtual App.Config file has a bindingRedirect entry for each conflicting set of assemblies such that the highest version assembly is chosen. A consequence of this is that there will never be a warning about conflicting assemblies because every conflict will have been resolved.\nWhen *true*, each distinct remapping will result in a high priority comment showing the old and new versions and that *AutoUnify* was true.\nWhen *true*, the AppConfigFile parameter must be empty\nWhen *false*, no assembly version remapping will occur automatically. When two versions of an assembly are present, a warning is issued.\nWhen *false*, each distinct conflict between different versions of the same assembly results in a high-priority comment. These comments are followed by a single warning. The warning has a unique error code and contains text that reads "Found conflicts between different versions of reference and dependent assemblies".`
        }),
        new AttributeSchema({
            name: "Assemblies",
            description: `Optional **[ITaskItem](https://msdn.microsoft.com/en-us/library/microsoft.build.framework.itaskitem.aspx)[]** parameter.\nSpecifies the items for which full paths and dependencies must be identified. These items can have either simple names like "System" or strong names like "System, Version=2.0.3500.0, Culture=neutral, PublicKeyToken=b77a5c561934e089."\nItems passed to this parameter may optionally have the following item metadata:\n- *Private*: *Boolean* value. If *true*, then the item is copied locally. The default value is *true*.\n- *HintPath*: *String* value. Specifies the path and file name to use as a reference. This is used when {HintPathFromItem} is specified in the *SearchPaths* parameter. The default value is an empty string.\n- *SpecificVersion*: *Boolean* value. If *true*, then the exact name specified in the *Include* attribute must match. If *false*, then any assembly with the same simple name will work. If *SpecificVersion* is not specified, then the task examines the value in the *Include* attribute of the item. If the attribute is a simple name, it behaves as if *SpecificVersion* was *false*. If the attribute is a strong name, it behaves as if *SpecificVersion* was *true*.\nWhen used with a Reference item type, the *Include* attribute needs to be the full fusion name of the assembly to be resolved. The assembly is only resolved if fusion exactly matches the *Include* attribute.\nWhen a project targets a .NET Framework version and references an assembly compiled for a higher .NET Framework version, the reference resolves only if it has *SpecificVersion* set to *true*.\nWhen a project targets a profile and references an assembly that is not in the profile, the reference resolves only if it has *SpecificVersion* set to *true*.\n- *ExecutableExtension*: *String* value. When present, the resolved assembly must have this extension. When absent, .dll is considered first, followed by .exe, for each examined directory.\n- *SubType*: *String* value. Only items with empty SubType metadata will be resolved into full assembly paths. Items with non-empty SubType metadata are ignored.\n- *AssemblyFolderKey*: *String* value. This metadata is supported for legacy purposes. It specifies a user-defined registry key, such as "hklm\\VendorFolder", that *Assemblies* should use to resolve assembly references.`
        }),
        new AttributeSchema({
            name: "AssemblyFiles",
            description: `Optional **[ITaskItem](https://msdn.microsoft.com/en-us/library/microsoft.build.framework.itaskitem.aspx)[]** parameter.\nSpecifies a list of fully qualified assemblies for which to find dependencies.\nItems passed to this parameter may optionally have the following item metadata:\n- *Private*: an optional *Boolean* value. If *true*, the item is copied locally.\n- *FusionName*: optional *String* metadata. Specifies the simple or strong name for this item. If this attribute is present, it can save time because the assembly file does not have to be opened to get the name.`
        }),
        new AttributeSchema({
            name: "AutoUnify",
            description: `Optional **Boolean** parameter.\nIf *true*, the resulting dependency graph is automatically treated as if there were an App.Config file passed in to the AppConfigFile parameter. This virtual App.Config file has a bindingRedirect entry for each conflicting set of assemblies so that the highest version assembly is chosen. A result of this is that there will never be a warning about conflicting assemblies because every conflict will have been resolved. Each distinct remapping will cause a high priority comment that indicates the old and new versions and the fact that this was done automatically because *AutoUnify* was *true*.\nIf *false*, no assembly version remapping will occur automatically. When two versions of an assembly are present, there will be a warning. Each distinct conflict between different versions of the same assembly will cause a high priority comment. After all these comments are displayed, there will be a single warning with a unique error code and text that reads "Found conflicts between different versions of reference and dependent assemblies".\nThe default value is *false*.`
        }),
        new AttributeSchema({
            name: "CandidateAssemblyFiles",
            description: `Optional **String[]** parameter.\nSpecifies a list of assemblies to use for the search and resolution process. Values passed to this parameter must be absolute file names or project-relative file names.\nAssemblies in this list will be considered when the *SearchPaths* parameter contains {CandidateAssemblyFiles} as one of the paths to consider.`
        }),
        new AttributeSchema({
            name: "CopyLocalDependenciesWhenParentReferenceInGac",
            description: `Optional **Boolean** parameter.\nIf *true*, to determine if a dependency should be copied locally, one of the checks done is to see if the parent reference in the project file has the Private metadata set. If set, then the Private value is used as a dependency.\nIf the metadata is not set, then the dependency goes through the same checks as the parent reference. One of these checks is to see if the reference is in the GAC. If a reference is in the GAC, then it is not copied locally, because it is assumed to be in the GAC on the target machine. This only applies to a specific reference and not its dependencies.\nFor example, a reference in the project file that is in the GAC is not copied locally, but its dependencies are copied locally because they are not in the GAC.\nIf false, project file references are checked to see if they are in the GAC, and are copied locally as appropriate.\nDependencies are checked to see if they are in the GAC and are also checked to see if the parent reference from the project file is in the GAC.\nIf the parent reference from the project file is in the GAC, the dependency is not copied locally.\nWhether this parameter is true or false, if there are multiple parent references and any of them are not in the GAC, then all of them are copied locally.`
        }),
        new AttributeSchema({
            name: "CopyLocalFiles",
            description: `Optional **[ITaskItem](https://msdn.microsoft.com/en-us/library/microsoft.build.framework.itaskitem.aspx)[]** read-only output parameter.\nReturns every file in the *ResolvedFiles*, *ResolvedDependencyFiles*, *RelatedFiles*, *SatelliteFiles*, and *ScatterFiles* parameters that has *CopyLocal* item metadata with a value of *true*.`
        }),
        new AttributeSchema({
            name: "FilesWritten",
            description: `Optional **[ITaskItem](https://msdn.microsoft.com/en-us/library/microsoft.build.framework.itaskitem.aspx)[]** output parameter.\nContains the items written to disk.`
        }),
        new AttributeSchema({
            name: "FindDependencies",
            description: `Optional **Boolean** parameter.\nIf *true*, dependencies will be found. Otherwise, only primary references are found. The default value is *true*.`
        }),
        new AttributeSchema({
            name: "FindRelatedFiles",
            description: `Optional **Boolean** parameter.\nIf *true*, related files such as .pdb files and .xml files will be found. The default value is *true*.`
        }),
        new AttributeSchema({
            name: "FindSatellites",
            description: `Optional **Boolean** parameter.\nIf *true*, satellite assemblies will be found. The default value is *true*.`
        }),
        new AttributeSchema({
            name: "FindSerializationAssemblies",
            description: `Optional **Boolean** parameter.\nIf *true*, then the task searches for serialization assemblies. The default value is *true*.`
        }),
        new AttributeSchema({
            name: "FullFrameworkAssemblyTables",
            description: `Optional **[ITaskItem](https://msdn.microsoft.com/en-us/library/microsoft.build.framework.itaskitem.aspx)[]** parameter.\nSpecifies items that have "FrameworkDirectory" metadata to associate a redist list with a particular framework directory. If the association is not made, an error will be logged. The resolve assembly reference (RAR) logic uses the target framework directory if a FrameworkDirectory is not set..`
        }),
        new AttributeSchema({
            name: "FullFrameworkFolders",
            description: `Optional **String[]** parameter.\nSpecifies the set of folders which contain a RedistList directory. This directory represents the full framework for a given client profile, for example, %programfiles%\reference assemblies\microsoft\framework\v4.0.`
        }),
        new AttributeSchema({
            name: "FullTargetFrameworkSubsetNames",
            description: `Optional **String[]** parameter.\nContains a list of target framework subset names. If a subset name in the list matches one in the *TargetFrameworkSubset* name property, then the system excludes that particular target framework subset at build time.`
        }),
        new AttributeSchema({
            name: "IgnoreDefaultInstalledAssemblyTables",
            description: `Optional **Boolean** parameter.\nIf *true*, then the task searches for and uses additional installed assembly tables (or, "Redist Lists") that are found in the \\RedistList directory under *TargetFrameworkDirectories*. The default value is *false*.`
        }),
        new AttributeSchema({
            name: "IgnoreDefaultInstalledAssemblySubsetTables",
            description: `Optional **Boolean** parameter.\nIf *true*, then the task searches for and uses additional installed assembly subset tables (or, "Subset Lists") that are found in the \\SubsetList directory under *TargetFrameworkDirectories*. The default value is *false*.`
        }),
        new AttributeSchema({
            name: "InstalledAssemblySubsetTables",
            description: `Optional **[ITaskItem](https://msdn.microsoft.com/en-us/library/microsoft.build.framework.itaskitem.aspx)[]** parameter.\nContains a list of XML files that specify the assemblies that are expected to be in the target subset.\nAs an option, items in this list can specify the "FrameworkDirectory" metadata to associate an *InstalledAssemblySubsetTable* with a particular framework directory.\nIf there is only one *TargetFrameworkDirectories* element, then any items in this list that lack the "FrameworkDirectory" metadata are treated as though they are set to the unique value that is passed to *TargetFrameworkDirectories*.`
        }),
        new AttributeSchema({
            name: "InstalledAssemblyTables",
            description: `Optional **String** parameter.\nContains a list of XML files that specify the assemblies that are expected to be installed on the target computer.\nWhen *InstalledAssemblyTables* is set, earlier versions of the assemblies in the list are merged into the newer versions that are listed in the XML. Also, assemblies that have a setting of InGAC='true' are considered prerequisites and are set to CopyLocal='false' unless explicitly overridden.\nAs an option, items in this list can specify "FrameworkDirectory" metadata to associate an *InstalledAssemblyTable* with a particular framework directory. However, this setting is ignored unless the Redist name begins with "Microsoft-Windows-CLRCoreComp". If there is only one *TargetFrameworkDirectories* element, then any items in this list that lack the "FrameworkDirectory" metadata are treated as if they are set to the unique value that is passed to *TargetFrameworkDirectories*.`
        }),
        new AttributeSchema({
            name: "LatestTargetFrameworkDirectories",
            description: `Optional **String[]** parameter.\nSpecifies a list of directories which contain the redist lists for the most current framework which can be targeted on the machine. If this is not set then the highest framework installed on the machine for a given target framework identifier is used.`
        }),
        new AttributeSchema({
            name: "ProfileName",
            description: `Optional **String** parameter.\nSpecifies the name of the framework profile to be targeted. For example, Client, Web, or Network.`
        }),
        new AttributeSchema({
            name: "RelatedFiles",
            description: `Optional **[ITaskItem](https://msdn.microsoft.com/en-us/library/microsoft.build.framework.itaskitem.aspx)[]** read-only output parameter.\nContains related files, such as XML and .pdb files that have the same base name as a reference.\nThe files listed in this parameter may optionally contain the following item metadata:\n- *Primary*: *Boolean* value. If *true*, then the file item was passed into the array by using the *Assemblies* parameter. Default value is *false*.\n- *CopyLocal*: *Boolean* value. Indicates whether the given reference should be copied to the output directory.`
        }),
        new AttributeSchema({
            name: "ResolvedDependencyFiles",
            description: `Optional **[ITaskItem](https://msdn.microsoft.com/en-us/library/microsoft.build.framework.itaskitem.aspx)[]** read-only output parameter.\nContains the *n*th order paths to dependencies. This parameter does not include first order primary references, which are contained in the *ResolvedFiles* parameter.\nThe items in this parameter optionally contain the following item metadata:\n- *CopyLocal*: *Boolean* value. Indicates whether the given reference should be copied to the output directory.\n- *FusionName*: *String* value. Specifies the name for this dependency.\n- *ResolvedFrom*: *String* value. Specifies the literal search path that this file was resolved from.`
        }),
        new AttributeSchema({
            name: "ResolvedFiles",
            description: `Optional **[ITaskItem](https://msdn.microsoft.com/en-us/library/microsoft.build.framework.itaskitem.aspx)[]** read-only output parameter.\nContains a list of all primary references resolved to full paths.\nThe items in this parameter optionally contain the following item metadata:\n- *CopyLocal*: *Boolean* value. Indicates whether the given reference should be copied to the output directory.\n- *FusionName*: *String* value. Specifies the name for this dependency.\n- *ResolvedFrom*: *String* value. Specifies the literal search path that this file was resolved from.`
        }),
        new AttributeSchema({
            name: "SatelliteFiles",
            description: `Optional **[ITaskItem](https://msdn.microsoft.com/en-us/library/microsoft.build.framework.itaskitem.aspx)[]** read-only output parameter.\nSpecifies any satellite files found. These will be CopyLocal=true if the reference or dependency that caused this item to exist is CopyLocal=true.\nThe items in this parameter optionally contain the following item metadata:\n- *CopyLocal*: *Boolean* value. Indicates whether the given reference should be copied to the output directory. This value is *true* if the reference or dependency that caused this item to exist has a *CopyLocal* value of *true*.\n- *DestinationSubDirectory*: *String* value. Specifies the relative destination directory to copy this item to.`
        }),
        new AttributeSchema({
            name: "ScatterFiles",
            description: `Optional **[ITaskItem](https://msdn.microsoft.com/en-us/library/microsoft.build.framework.itaskitem.aspx)[]** read-only output parameter.\nContains the scatter files associated with one of the given assemblies.\nThe items in this parameter optionally contain the following item metadata:\n- *CopyLocal*: *Boolean* value. Indicates whether the given reference should be copied to the output directory.`
        }),
        new AttributeSchema({
            name: "SearchPaths",
            description: `Required **String[]** parameter.\nSpecifies the directories or special locations that are searched to find the files on disk that represent the assemblies. The order in which the search paths are listed is important. For each assembly, the list of paths is searched from left to right. When a file that represents the assembly is found, that search stops and the search for the next assembly starts.\nThis parameter accepts the following types of values:\n- A directory path.\n- {HintPathFromItem}: Specifies that the task will examine the *HintPath* metadata of the base item.\n- {CandidateAssemblyFiles}: Specifies that the task will examine the files passed in through the *CandidateAssemblyFiles* parameter.\n- {Registry:_AssemblyFoldersBase_, _RuntimeVersion_, _AssemblyFoldersSuffix_}:\n- {AssemblyFolders}: Specifies the task will use the Visual Studio.NET 2003 finding-assemblies-from-registry scheme.\n- {GAC}: Specifies the task will search in the GAC.\n- {RawFileName}: Specifies the task will consider the *Include* value of the item to be an exact path and file name.`,
            required: true
        }),
        new AttributeSchema({
            name: "SerializationAssemblyFiles",
            description: `Optional **[ITaskItem](https://msdn.microsoft.com/en-us/library/microsoft.build.framework.itaskitem.aspx)[]** read-only output parameter.\nContains any XML serialization assemblies found. These items are marked CopyLocal=true if and only if the reference or dependency that caused this item to exist is CopyLocal=true.\nThe *Boolean* metadata CopyLocal indicates whether the given reference should be copied to the output directory.`
        }),
        new AttributeSchema({
            name: "Silent",
            description: `Optional **Boolean** parameter.\nIf *true*, no messages are logged. The default value is *false*.`
        }),
        new AttributeSchema({
            name: "StateFile",
            description: `Optional **String** parameter.\nSpecifies a file name that indicates where to save the intermediate build state for this task.`
        }),
        new AttributeSchema({
            name: "SuggestedRedirects",
            description: `Optional **[ITaskItem](https://msdn.microsoft.com/en-us/library/microsoft.build.framework.itaskitem.aspx)[]** read-only output parameter.\nContains one item for every distinct conflicting assembly identity, regardless of the value of the *AutoUnify* parameter. This includes every culture and PKT that was found that did not have a suitable bindingRedirect entry in the application configuration file.\nEach item optionally contains the following information:\n- *Include* attribute: Contains the full name of the assembly family with a Version field value of 0.0.0.0\n- *MaxVersion* item metadata: Contains the maximum version number.`
        }),
        new AttributeSchema({
            name: "TargetedRuntimeVersion",
            description: `Optional **String** parameter.\nSpecifies the runtime version to target, for example, 2.0.57027 or v2.0.57027.`
        }),
        new AttributeSchema({
            name: "TargetFrameworkDirectories",
            description: `Optional **String[]** parameter.\nSpecifies the path of the target framework directory. This parameter is required to determine the CopyLocal status for resulting items.\nIf this parameter is not specified, no resulting items will be have a *CopyLocal* value of *true* unless they explicitly have a *Private* metadata value of *true* on their source item.`
        }),
        new AttributeSchema({
            name: "TargetFrameworkMoniker",
            description: `Optional **String** parameter.\nThe TargetFrameworkMoniker to monitor, if any. This is used for logging.`
        }),
        new AttributeSchema({
            name: "TargetFrameworkMonikerDisplayName",
            description: `Optional **String** parameter.\nThe display name of the TargetFrameworkMoniker to monitor, if any. This is used for logging.`
        }),
        new AttributeSchema({
            name: "TargetFrameworkSubsets",
            description: `Optional **String[]** parameter.\nContains a list of target framework subset names to be searched for in the target framework directories.`
        }),
        new AttributeSchema({
            name: "TargetFrameworkVersion",
            description: `Optional **String** parameter.\nThe project target framework version. The default value is empty, which means there is no filtering for the references based on target framework.`
        }),
        new AttributeSchema({
            name: "TargetProcessorArchitecture",
            description: `Optional **String** parameter.\nThe preferred target processor architecture. Used for resolving Global Assembly Cache (GAC) references.\nThis parameter can have a value of *x86*, *IA64* or *AMD64*.\nIf this parameter is absent, the task first considers assemblies that match the architecture of the currently running process. If no assembly is found, the task considers assemblies in the GAC that have *ProcessorArchitecture* value of *MSIL* or no *ProcessorArchitecture* value.`
        })
    ]
});

const resolveComReferenceTaskSchema = new TaskSchema({
    name: "ResolveComReference",
    description: `Takes a list of one or more type library names or .tlb files and resolves those type libraries to locations on disk.`,
    msdn: "https://msdn.microsoft.com/en-us/library/56e00bfh.aspx",
    attributes: [
        new AttributeSchema({
            name: "DelaySign",
            description: `Optional **Boolean** parameter.\nIf *true*, places the public key in the assembly. If *false*, fully signs the assembly.`
        }),
        new AttributeSchema({
            name: "EnvironmentVariables",
            description: `Optional **String[]** parameter.\nArray of pairs of environment variables, separated by equal signs. These variables are passed to the spawned tlbimp.exe and aximp.exe in addition to, or selectively overriding, the regular environment block..`
        }),
        new AttributeSchema({
            name: "ExecuteAsTool",
            description: `Optional **Boolean** parameter.\nIf *true*, runs tlbimp.exe and aximp.exe from the appropriate target framework out-of-proc to generate the necessary wrapper assemblies. This parameter enables multi-targeting.`
        }),
        new AttributeSchema({
            name: "IncludeVersionInInteropName",
            description: `Optional **Boolean** parameter.\nIf *true*, the typelib version will be included in the wrapper name. The default is *false*.`
        }),
        new AttributeSchema({
            name: "KeyContainer",
            description: `Optional **String** parameter.\nSpecifies a container that holds a public/private key pair.`
        }),
        new AttributeSchema({
            name: "KeyFile",
            description: `Optional **String** parameter.\nSpecifies an item that contains a public/private key pair.`
        }),
        new AttributeSchema({
            name: "NoClassMembers",
            description: `Optional **Boolean** parameter.`
        }),
        new AttributeSchema({
            name: "ResolvedAssemblyReferences",
            description: `Optional **[ITaskItem](https://msdn.microsoft.com/en-us/library/microsoft.build.framework.itaskitem.aspx)[]** output parameter.\nSpecifies the resolved assembly references.`
        }),
        new AttributeSchema({
            name: "ResolvedFiles",
            description: `Optional **[ITaskItem](https://msdn.microsoft.com/en-us/library/microsoft.build.framework.itaskitem.aspx)[]** output parameter.\nSpecifies the fully qualified files on disk that correspond to the physical locations of the type libraries that were provided as input to this task.`
        }),
        new AttributeSchema({
            name: "ResolvedModules",
            description: `Optional **[ITaskItem](https://msdn.microsoft.com/en-us/library/microsoft.build.framework.itaskitem.aspx)[]** parameter.`
        }),
        new AttributeSchema({
            name: "SdkToolsPath",
            description: `Optional **String** parameter.\nIf *ExecuteAsTool* is *true*, this parameter must be set to the SDK tools path for the framework version being targeted.`
        }),
        new AttributeSchema({
            name: "StateFile",
            description: `Optional **String** parameter.\nSpecifies the cache file for COM component timestamps. If not present, every run will regenerate all the wrappers.`
        }),
        new AttributeSchema({
            name: "TargetFrameworkVersion",
            description: `Optional **String** parameter.\nSpecifies the project target framework version.\nThe default is *String.Empty*. which means there is no filtering for a reference based on the target framework.`
        }),
        new AttributeSchema({
            name: "TargetProcessorArchitecture",
            description: `Optional **String** parameter.\nSpecifies the preferred target processor architecture. Passed to the tlbimp.exe /machine flag after translation.\nThe parameter value should be a member of [ProcessorArchitecture](https://msdn.microsoft.com/en-us/library/microsoft.build.utilities.processorarchitecture.aspx).`
        }),
        new AttributeSchema({
            name: "TypeLibFiles",
            description: `Optional **[ITaskItem](https://msdn.microsoft.com/en-us/library/microsoft.build.framework.itaskitem.aspx)[]** parameter.\nSpecifies the type library file path to COM references. Items included in this parameter may contain item metadata. For more information, see the section "TypeLibFiles Item Metadata" below.`
        }),
        new AttributeSchema({
            name: "TypeLibNames",
            description: `Optional **[ITaskItem](https://msdn.microsoft.com/en-us/library/microsoft.build.framework.itaskitem.aspx)[]** parameter.\nSpecifies the type library names to resolve. Items included in this parameter must contain some item metadata. For more information, see the section "TypeLibNames Item Metadata" below.`
        }),
        new AttributeSchema({
            name: "WrapperOutputDirectory",
            description: `Optional **String** parameter.\nThe location on disk where the generated interop assembly is placed. If this item metadata is not specified, the task uses the absolute path of the directory where the project file is located.`
        })
    ]
});

const resolveKeySourceTaskSchema = new TaskSchema({
    name: "ResolveKeySource",
    description: `Determines the strong name key source.`,
    msdn: "https://msdn.microsoft.com/en-us/library/ms164301.aspx",
    attributes: [
        new AttributeSchema({
            name: "AutoClosePasswordPromptShow",
            description: `Optional **Int32** parameter.\nGets or sets the amount of time, in seconds, to display the count down message.`
        }),
        new AttributeSchema({
            name: "AutoClosePasswordPromptTimeout",
            description: `Optional **Int32** parameter.\nGets or sets the amount of time, in seconds, to wait before closing the password prompt dialog.`
        }),
        new AttributeSchema({
            name: "CertificateFile",
            description: `Optional **String** parameter.\nGets or sets the path of the certificate file.`
        }),
        new AttributeSchema({
            name: "CertificateThumbprint",
            description: `Optional **String** parameter.\nGets or sets the certificate thumbprint.`
        }),
        new AttributeSchema({
            name: "KeyFile",
            description: `Optional **String** parameter.\nGets or sets the path of the key file.`
        }),
        new AttributeSchema({
            name: "ResolvedKeyContainer",
            description: `Optional **String** output parameter.\nGets or sets the resolved key container.`
        }),
        new AttributeSchema({
            name: "ResolvedKeyFile",
            description: `Optional **String** output parameter.\nGets or sets the resolved key file.`
        }),
        new AttributeSchema({
            name: "ResolvedThumbprint",
            description: `Optional **String** output parameter.\nGets or sets the resolved certificate thumbprint.`
        }),
        new AttributeSchema({
            name: "ShowImportDialogDespitePreviousFailures",
            description: `Optional **Boolean** parameter.\nIf *true*, show the import dialog despite previous failures.`
        }),
        new AttributeSchema({
            name: "SuppressAutoClosePasswordPrompt",
            description: `Optional **Boolean** parameter.\nGets or sets a Boolean value that specifies whether the password prompt dialog should not auto-close.`
        })
    ]
});

const resolveManifestFilesTaskSchema = new TaskSchema({
    name: "ResolveManifestFiles",
    description: `Resolves the following items in the build process to files for manifest generation: built items, dependencies, satellites, content, debug symbols, and documentation.`,
    msdn: "https://msdn.microsoft.com/en-us/library/ff598691.aspx",
    attributes: [
        new AttributeSchema({
            name: "DeploymentManifestEntryPoint",
            description: `Optional **[ITaskItem](https://msdn.microsoft.com/en-us/library/microsoft.build.framework.itaskitem.aspx)** parameter.\nSpecifies the name of the deployment manifest.`
        }),
        new AttributeSchema({
            name: "EntryPoint",
            description: `Optional **[ITaskItem](https://msdn.microsoft.com/en-us/library/microsoft.build.framework.itaskitem.aspx)** parameter.\nSpecifies the managed assembly or ClickOnce manifest reference that is the entry point to the manifest.`
        }),
        new AttributeSchema({
            name: "ExtraFiles",
            description: `Optional **[ITaskItem](https://msdn.microsoft.com/en-us/library/microsoft.build.framework.itaskitem.aspx)[]** parameter.\nSpecifies the extra files.`
        }),
        new AttributeSchema({
            name: "ManagedAssemblies",
            description: `Optional **[ITaskItem](https://msdn.microsoft.com/en-us/library/microsoft.build.framework.itaskitem.aspx)[]** parameter.\nSpecifies the managed assemblies.`
        }),
        new AttributeSchema({
            name: "NativeAssemblies",
            description: `Optional **[ITaskItem](https://msdn.microsoft.com/en-us/library/microsoft.build.framework.itaskitem.aspx)[]** parameter.\nSpecifies the native assemblies.`
        }),
        new AttributeSchema({
            name: "OutputAssemblies",
            description: `Optional **[ITaskItem](https://msdn.microsoft.com/en-us/library/microsoft.build.framework.itaskitem.aspx)[]** output parameter.\nSpecifies the generated assemblies.`
        }),
        new AttributeSchema({
            name: "OutputDeploymentManifestEntryPoint",
            description: `Optional **[ITaskItem](https://msdn.microsoft.com/en-us/library/microsoft.build.framework.itaskitem.aspx)** output parameter.\nSpecifies the output deployment manifest entry point.`
        }),
        new AttributeSchema({
            name: "OutputEntryPoint",
            description: `Optional **[ITaskItem](https://msdn.microsoft.com/en-us/library/microsoft.build.framework.itaskitem.aspx)** output parameter.\nSpecifies the output entry point.`
        }),
        new AttributeSchema({
            name: "OutputFiles",
            description: `Optional **[ITaskItem](https://msdn.microsoft.com/en-us/library/microsoft.build.framework.itaskitem.aspx)[]** output parameter.\nSpecifies the output files.`
        }),
        new AttributeSchema({
            name: "PublishFiles",
            description: `Optional **[ITaskItem](https://msdn.microsoft.com/en-us/library/microsoft.build.framework.itaskitem.aspx)[]** parameter.\nSpecifies the publish files.`
        }),
        new AttributeSchema({
            name: "SatelliteAssemblies",
            description: `Optional **[ITaskItem](https://msdn.microsoft.com/en-us/library/microsoft.build.framework.itaskitem.aspx)[]** parameter.\nSpecifies the satellite assemblies.`
        }),
        new AttributeSchema({
            name: "SigningManifests",
            description: `Optional **Boolean** parameter.\nIf *true*, the manifests are signed.`
        }),
        new AttributeSchema({
            name: "TargetCulture",
            description: `Optional **String** parameter.\nSpecifies the target culture for satellite assemblies.`
        }),
        new AttributeSchema({
            name: "TargetFrameworkVersion",
            description: `Optional **String** parameter.\nSpecifies the target .NET Framework version.`
        })
    ]
});

const resolveNativeReferenceTaskSchema = new TaskSchema({
    name: "ResolveNativeReference",
    description: `Resolves native references. Implements the [ResolveNativeReference](https://msdn.microsoft.com/en-us/library/microsoft.build.tasks.resolvenativereference.aspx) class. This class supports the .NET Framework infrastructure which is not intended to be used directly from your code.`,
    msdn: `https://msdn.microsoft.com/en-us/library/ms164302.aspx`,
    attributes: [
        new AttributeSchema({
            name: 'AdditionalSearchPaths',
            description: `Required **String[]** parameter.\nGets or sets the search paths for resolving assembly identities of native references.`,
            required: true
        }),
        new AttributeSchema({
            name: "ContainedComComponents",
            description: `Optional **[ITaskItem](https://msdn.microsoft.com/en-us/library/microsoft.build.framework.itaskitem.aspx)[]** output parameter.\nGets or sets the COM components of the native assembly.`
        }),
        new AttributeSchema({
            name: "ContainedLooseEtcFiles",
            description: `Optional **[ITaskItem](https://msdn.microsoft.com/en-us/library/microsoft.build.framework.itaskitem.aspx)[]** output parameter.\nGets or sets the loose Etc files listed in the native manifest.`
        }),
        new AttributeSchema({
            name: "ContainedLooseTlbFiles",
            description: `Optional **[ITaskItem](https://msdn.microsoft.com/en-us/library/microsoft.build.framework.itaskitem.aspx)[]** output parameter.\nGets or sets the loose .tlb files of the native assembly.`
        }),
        new AttributeSchema({
            name: "ContainedPrerequisiteAssemblies",
            description: `Optional **[ITaskItem](https://msdn.microsoft.com/en-us/library/microsoft.build.framework.itaskitem.aspx)[]** output parameter.\nGets or sets the assemblies that must be present before the manifest can be used.`
        }),
        new AttributeSchema({
            name: "ContainedTypeLibraries",
            description: `Optional **[ITaskItem](https://msdn.microsoft.com/en-us/library/microsoft.build.framework.itaskitem.aspx)[]** output parameter.\nGets or sets the type libraries of the native assembly.`
        }),
        new AttributeSchema({
            name: "ContainingReferenceFiles",
            description: `Optional **[ITaskItem](https://msdn.microsoft.com/en-us/library/microsoft.build.framework.itaskitem.aspx)[]** output parameter.\nGets or sets the reference files.`
        }),
        new AttributeSchema({
            name: "NativeReferences",
            description: `Required **[ITaskItem](https://msdn.microsoft.com/en-us/library/microsoft.build.framework.itaskitem.aspx)[]** parameter.\nGets or sets the Win32 native assembly references.`,
            required: true
        })
    ]
});

const resolveNonMSBuildProjectOutputTaskSchema = new TaskSchema({
    name: "ResolveNonMSBuildProjectOutput",
    description: `Determines the output files for non-MSBuild project references.`,
    msdn: `https://msdn.microsoft.com/en-us/library/ff598690.aspx`,
    attributes: [
        new AttributeSchema({
            name: "PreresolvedProjectOutputs",
            description: `Optional **String** parameter.\nSpecifies an XML string that contains resolved project outputs.`
        }),
        new AttributeSchema({
            name: "ProjectReferences",
            description: `Required **[ITaskItem](https://msdn.microsoft.com/en-us/library/microsoft.build.framework.itaskitem.aspx)[]** parameter.\nSpecifies the project references.`,
            required: true
        }),
        new AttributeSchema({
            name: "ResolvedOutputPaths",
            description: `Optional **[ITaskItem](https://msdn.microsoft.com/en-us/library/microsoft.build.framework.itaskitem.aspx)[]** output parameter.\nContains the list of resolved reference paths (and preserves the original project reference attributes).`
        }),
        new AttributeSchema({
            name: "UnresolvedProjectReferences",
            description: `Optional **[ITaskItem](https://msdn.microsoft.com/en-us/library/microsoft.build.framework.itaskitem.aspx)[]** output parameter.\nContains the list of project reference items that could not be resolved by using the preresolved list of outputs.\nBecause Visual Studio only preresolves non-MSBuild projects, this means that project references in this list are in the MSBuild format.`
        })
    ]
});

const setEnvTaskSchema = new TaskSchema({
    name: "SetEnv",
    description: `Sets or deletes the value of a specified environment variable.`,
    msdn: `https://msdn.microsoft.com/en-us/library/ee862485.aspx`,
    attributes: [
        new AttributeSchema({
            name: "Name",
            description: `Required **String** parameter.\nThe name of an environment variable.`,
            required: true
        }),
        new AttributeSchema({
            name: "OutputEnvironmentVariable",
            description: `Optional **String** output parameter.\nContains the value that is assigned to the environment variable that is specified by the **Name** parameter.`
        }),
        new AttributeSchema({
            name: "Prefix",
            description: `Mandatory **Boolean** parameter.\nIf *true*, concatenates the value of the *Value* parameter before the value of the environment variable that is specified by the *Name* parameter, and then assigns the result to the environment variable. If *false*, assigns only the value of the *Value* parameter to the environment variable.`
        }),
        new AttributeSchema({
            name: "Target",
            description: `Optional **String** parameter.\nSpecifies the location where an environment variable is stored. Specify "*User*" or "*Machine*".\nFor more information, see "EnvironmentVariableTarget Enumeration" on the [MSDN](http://go.microsoft.com/fwlink/?LinkId=737) Web site.`
        }),
        new AttributeSchema({
            name: "Value",
            description: `Optional **String** parameter.\nThe value assigned to the environment variable that is specified by the *Name* parameter. If *Value* is empty and the variable exists, the variable is deleted. If the variable does not exist, no error occurs even though the operation cannot be performed.\nFor more information, see "Environment::SetEnvironmentVariable Method" on the [MSDN](http://go.microsoft.com/fwlink/?LinkId=737) Web site.`
        })
    ]
});

const sgenTaskSchema = new TaskSchema({
    name: "SGen",
    description: `Creates an XML serialization assembly for types in the specified assembly. This task wraps the XML Serializer Generator Tool (Sgen.exe). For more information, see [XML Serializer Generator Tool (Sgen.exe)](https://msdn.microsoft.com/en-us/library/bk3w6240.aspx).`,
    msdn: "https://msdn.microsoft.com/en-us/library/ms164303.aspx",
    attributes: [
        new AttributeSchema({
            name: "BuildAssemblyName",
            description: `Required **String** parameter.\nThe assembly to generate serialization code for.`,
            required: true
        }),
        new AttributeSchema({
            name: "BuildAssemblyPath",
            description: `Required **String** parameter.\nThe path to the assembly to generate serialization code for.`,
            required: true
        }),
        new AttributeSchema({
            name: "DelaySign",
            description: `Optional **Boolean** parameter.\nIf *true*, specifies that you want a fully signed assembly. If *false*, specifies that you only want to place the public key in the assembly.\nThis parameter has no effect unless used with either the *KeyFile* or *KeyContainer* parameter.`
        }),
        new AttributeSchema({
            name: "KeyContainer",
            description: `Optional **String** parameter.\nSpecifies a container that holds a key pair. This will sign the assembly by inserting a public key into the assembly manifest. The task will then sign the final assembly with the private key.`
        }),
        new AttributeSchema({
            name: "KeyFile",
            description: `Optional **String** parameter.\nSpecifies a key pair or a public key to use to sign an assembly. The compiler inserts the public key in the assembly manifest and then signs the final assembly with the private key.`
        }),
        new AttributeSchema({
            name: "Platform",
            description: `Optional **String** parameter.\nGets or Sets the Compiler Platform used to generate the output assembly. This parameter can have a value of *x86*, *x64*, or *anycpu*. Default is *anycpu*.`
        }),
        new AttributeSchema({
            name: "References",
            description: `Optional **String[]** parameter.\nSpecifies the assemblies that are referenced by the types requiring XML serialization.`
        }),
        new AttributeSchema({
            name: "SdkToolsPath",
            description: `Optional **String** parameter.\nSpecifies the path to the SDK tools, such as resgen.exe.`
        }),
        new AttributeSchema({
            name: "SerializationAssembly",
            description: `Optional **[ITaskItem](https://msdn.microsoft.com/en-us/library/microsoft.build.framework.itaskitem.aspx)[]** output parameter.\nContains the generated serialization assembly.`
        }),
        new AttributeSchema({
            name: "SerializationAssemblyName",
            description: `Optional **String** parameter.\nSpecifies the name of the generated serialization assembly.`
        }),
        new AttributeSchema({
            name: "ShouldGenerateSerializer",
            description: `Required **Boolean** parameter.\nIf *true*, the SGen task should generate a serialization assembly.`,
            required: true
        }),
        new AttributeSchema({
            name: "Timeout",
            description: `Optional **Int32** parameter.\nSpecifies the amount of time, in milliseconds, after which the task executable is terminated. The default value is *Int.MaxValue*, indicating that there is no time out period.`
        }),
        new AttributeSchema({
            name: "ToolPath",
            description: `Optional **String** parameter.\nSpecifies the location from where the task will load the underlying executable file (sgen.exe). If this parameter is not specified, the task uses the SDK installation path corresponding to the version of the framework that is running MSBuild.`
        }),
        new AttributeSchema({
            name: "Types",
            description: `Optional **String[]** parameter.\nGets or sets a list of specific Types to generate serialization code for. SGen will generate serialization code only for those types.`
        }),
        new AttributeSchema({
            name: "UseProxyTypes",
            description: `Required **Boolean** parameter.\nIf *true*, the SGen task generates serialization code only for the XML Web service proxy types.`,
            required: true
        })
    ]
});

const signFileTaskSchema = new TaskSchema({
    name: "SignFile",
    description: `Signs the specified file using the specified certificate. Note that SHA-256 certificates are allowed only on machines that have .NET 4.5 and higher.`,
    msdn: "https://msdn.microsoft.com/en-us/library/ms164304.aspx",
    attributes: [
        new AttributeSchema({
            name: "CertificateThumbprint",
            description: `Required **String** parameter.\nSpecifies the certificate to use for signing. This certificate must be in the current user's personal store.`,
            required: true
        }),
        new AttributeSchema({
            name: "SigningTarget",
            description: `Required **[ITaskItem](https://msdn.microsoft.com/en-us/library/microsoft.build.framework.itaskitem.aspx)** parameter.\nSpecifies the files to sign with the certificate.`,
            required: true
        }),
        new AttributeSchema({
            name: "TimestampUrl",
            description: `Optional **String** parameter.\nSpecifies the URL of a time stamping server.`
        }),
        new AttributeSchema({
            name: "TargetFrameworkVersion",
            description: `Optional **String** parameter.\nThe version of the .NET Framework that is used for the target.`
        })
    ]
});

const touchTaskSchema = new TaskSchema({
    name: "Touch",
    description: `Sets the access and modification times of files.`,
    msdn: `https://msdn.microsoft.com/en-us/library/37fwbyt5.aspx`,
    attributes: [
        new AttributeSchema({
            name: "AlwaysCreate",
            description: `Optional **Boolean** parameter.\nIf *true*, creates any files that do not already exist.`
        }),
        new AttributeSchema({
            name: "Files",
            description: `Required **[ITaskItem](https://msdn.microsoft.com/en-us/library/microsoft.build.framework.itaskitem.aspx)[]** parameter.\nSpecifies the collection of files to touch.`,
            required: true
        }),
        new AttributeSchema({
            name: "ForceTouch",
            description: `Optional **Boolean** parameter.\nIf *true*, forces a file touch even if the files are read-only.`
        }),
        new AttributeSchema({
            name: "Time",
            description: `Optional **String** parameter.\nSpecifies a time other than the current time. The format must be a format that is acceptable to the [Parse](https://msdn.microsoft.com/en-us/library/1k1skd40.aspx) method.`
        }),
        new AttributeSchema({
            name: "TouchedFiles",
            description: `Optional **[ITaskItem](https://msdn.microsoft.com/en-us/library/microsoft.build.framework.itaskitem.aspx)[]** output parameter.\nContains the collection of items that were successfully touched.`
        })
    ]
});

const unregisterAssemblyTaskSchema = new TaskSchema({
    name: "UnregisterAssembly",
    description: `Unregisters the specified assemblies for COM interop purposes. Performs the reverse of the [RegisterAssembly](https://msdn.microsoft.com/en-us/library/dakwb8wf.aspx) task.\nIt is not required that the assembly exists for this task to be successful. If you attempt to unregister an assembly that does not exist, the task will succeed with a warning. This occurs because it is the job of this task to remove the assembly registration from the registry. If the assembly does not exist, it is not in the registry, and therefore, the task succeeded.`,
    msdn: "https://msdn.microsoft.com/en-us/library/a8d5b2y5.aspx",
    attributes: [
        new AttributeSchema({
            name: "Assemblies",
            description: `Optional **[ITaskItem](https://msdn.microsoft.com/en-us/library/microsoft.build.framework.itaskitem.aspx)[]** parameter.\nSpecifies the assemblies to be unregistered.`
        }),
        new AttributeSchema({
            name: "AssemblyListFile",
            description: `Optional **[ITaskItem](https://msdn.microsoft.com/en-us/library/microsoft.build.framework.itaskitem.aspx)** parameter.\nContains information about the state between the *RegisterAssembly* task and the *UnregisterAssembly* task. This prevents the task from attempting to unregister an assembly that failed to register in the *RegisterAssembly* task.\nIf this parameter is specified, the *Assemblies* and *TypeLibFiles* parameters are ignored.`
        }),
        new AttributeSchema({
            name: "TypeLibFiles",
            description: `Optional **[ITaskItem](https://msdn.microsoft.com/en-us/library/microsoft.build.framework.itaskitem.aspx)[]** output parameter.\nUnregisters the specified type library from the specified assembly. **Note:** This parameter is only necessary if the type library file name is different than the assembly name.`
        })
    ]
});

const updateManifestTaskSchema = new TaskSchema({
    name: "UpdateManifest",
    description: `Updates selected properties in a manifest and resigns.`,
    msdn: "https://msdn.microsoft.com/en-us/library/ff598683.aspx",
    attributes: [
        new AttributeSchema({
            name: "ApplicationManifest",
            description: `Required **[ITaskItem](https://msdn.microsoft.com/en-us/library/microsoft.build.framework.itaskitem.aspx)** parameter.\nSpecifies the application manifest.`,
            required: true
        }),
        new AttributeSchema({
            name: "ApplicationPath",
            description: `Required **String** parameter.\nSpecifies the path of the application manifest.`,
            required: true
        }),
        new AttributeSchema({
            name: "InputManifest",
            description: `Required **[ITaskItem](https://msdn.microsoft.com/en-us/library/microsoft.build.framework.itaskitem.aspx)** parameter.\nSpecifies the manifest to update.`,
            required: true
        }),
        new AttributeSchema({
            name: "OutputManifest",
            description: `Optional **[ITaskItem](https://msdn.microsoft.com/en-us/library/microsoft.build.framework.itaskitem.aspx)** output parameter.\nSpecifies the manifest that contains updated properties.`
        })
    ]
});

const vbcTaskSchema = new TaskSchema({
    name: "Vbc",
    description: `Wraps vbc.exe, which produces executables (.exe), dynamic-link libraries (.dll), or code modules (.netmodule). For more information on vbc.exe, see [Visual Basic Command-Line Compiler](https://msdn.microsoft.com/en-us/library/s4kbxexc.aspx).`,
    msdn: "https://msdn.microsoft.com/en-us/library/sb7a1e29.aspx",
    attributes: [
        new AttributeSchema({
            name: "AdditionalLibPaths",
            description: `Optional **String[]** parameter.\nSpecifies additional folders in which to look for assemblies specified in the References attribute.`
        }),
        new AttributeSchema({
            name: "AddModules",
            description: `Optional **String[]** parameter.\nCauses the compiler to make all type information from the specified file(s) available to the project you are currently compiling. This parameter corresponds to the [/addmodule](https://msdn.microsoft.com/en-us/library/1zbs3z8d.aspx) switch of the vbc.exe compiler.`
        }),
        new AttributeSchema({
            name: "BaseAddress",
            description: `Optional **String** parameter.\nSpecifies the base address of the DLL. This parameter corresponds to the [/baseaddress](https://msdn.microsoft.com/en-us/library/5td1wkc5.aspx) switch of the vbc.exe compiler.`
        }),
        new AttributeSchema({
            name: "CodePage",
            description: `Optional **Int32** parameter.\nSpecifies the code page to use for all source code files in the compilation. This parameter corresponds to the [/codepage](https://msdn.microsoft.com/en-us/library/974213w8.aspx) switch of the vbc.exe compiler.`
        }),
        new AttributeSchema({
            name: "DebugType",
            description: `Optional **String[]** parameter.\nCauses the compiler to generate debugging information. This parameter can have the following values:\n- *full*\n- *pdbonly*\n\nThe default value is *full*, which enables attaching a debugger to the running program. A value of *pdbonly* allows source code debugging when the program is started in the debugger, but displays assembly language code only when the running program is attached to the debugger. For more information, see [/debug (Visual Basic)](https://msdn.microsoft.com/en-us/library/etx40x86.aspx).`
        }),
        new AttributeSchema({
            name: "DefineConstants",
            description: `Optional **String[]** parameter.\nDefines conditional compiler constants. Symbol/value pairs are separated by semicolons and are specified with the following syntax:\n*symbol1 = value1 ; symbol2 = value2*\nThis parameter corresponds to the [/define](https://msdn.microsoft.com/en-us/library/s477hyxw.aspx) switch of the vbc.exe compiler.`
        }),
        new AttributeSchema({
            name: "DelaySign",
            description: `Optional **Boolean** parameter.\nIf *true*, the task places the public key in the assembly. If *false*, the task fully signs the assembly. The default value is *false*. This parameter has no effect unless used with the *KeyFile* parameter or the *KeyContainer* parameter. This parameter corresponds to the [/delaysign](https://msdn.microsoft.com/en-us/library/6fb81bb5.aspx) switch of the vbc.exe compiler.`
        }),
        new AttributeSchema({
            name: "DisabledWarnings",
            description: `Optional **String** parameter.\nSuppresses the specified warnings. You only need to specify the numeric part of the warning identifier. Multiple warnings are separated by semicolons. This parameter corresponds to the [/nowarn](https://msdn.microsoft.com/en-us/library/c86sssa5.aspx) switch of the vbc.exe compiler.`
        }),
        new AttributeSchema({
            name: "DocumentationFile",
            description: `Optional **String** parameter.\nProcesses documentation comments to the specified XML file. This parameter overrides the *GenerateDocumentation* attribute. For more information, see [/doc](https://msdn.microsoft.com/en-us/library/f64ezf9b.aspx).`
        }),
        new AttributeSchema({
            name: "EmitDebugInformation",
            description: `Optional **Boolean** parameter.\nIf *true*, the task generates debugging information and places it in a .pdb file. For more information, see [/debug (Visual Basic)](https://msdn.microsoft.com/en-us/library/etx40x86.aspx).`
        }),
        new AttributeSchema({
            name: 'ErrorReport',
            description: `Optional **String** parameter.\nSpecifies how the task should report internal compiler errors. This parameter can have the following values:\n- *prompt*\n- *send*\n- *none*\n\nIf *prompt* is specified and an internal compiler error occurs, the user is prompted with an option of wheter to send the error data to Microsoft.\nIf *send* is specified and an internal compiler error occurs, the task sends the error data to Microsoft.\nThe default value is *none*, which reports errors in text output only.\nThis parameter corresponds to the [/errorreport](https://msdn.microsoft.com/en-us/library/5sa98se7.aspx) switch of the vbc.exe compiler.`
        }),
        new AttributeSchema({
            name: "FileAlignment",
            description: `Optional **Int32** parameter.\nSpecifies, in bytes, where to align the sections of the output file. This parameter can have the following values:\n- *512*\n- *1024*\n- *2048*\n- *4096*\n- *8192*\n\nThis parameter corresponds to the [/filealign](https://msdn.microsoft.com/en-us/library/wf5kss02.aspx) switch of the vbc.exe compiler.`
        }),
        new AttributeSchema({
            name: "GenerateDocumentation",
            description: `Optional **Boolean** parameter.\nIf *true*, generates documentation information and places it in an XML file with the name of the executable file or library that the task is creating. For more information, see [/doc](https://msdn.microsoft.com/en-us/library/f64ezf9b.aspx).`
        }),
        new AttributeSchema({
            name: "Imports",
            description: `Optional **[ITaskItem](https://msdn.microsoft.com/en-us/library/microsoft.build.framework.itaskitem.aspx)[]** parameter.\nImports namespaces from the specified item collections. This parameter corresponds to the [/imports](https://msdn.microsoft.com/en-us/library/64c84czf.aspx) switch of the vbc.exe compiler.`
        }),
        new AttributeSchema({
            name: "KeyContainer",
            description: `Optional **String** parameter.\nSpecifies the name of the cryptographic key container. This parameter corresonds to the [/keycontainer](https://msdn.microsoft.com/en-us/library/h71y5024.aspx) switch of the vbc.exe compiler.`
        }),
        new AttributeSchema({
            name: "KeyFile",
            description: `Optional **String** parameter.\nSpecifies the file name containing the cryptographic key. For more information, see [/keyfile](https://msdn.microsoft.com/en-us/library/wb84w704.aspx).`
        }),
        new AttributeSchema({
            name: "LangVersion",
            description: `Optional **String** parameter.\nSpecifies the language version, either "9" or "10".`
        }),
        new AttributeSchema({
            name: "LinkResources",
            description: `Optional **[ITaskItem](https://msdn.microsoft.com/en-us/library/microsoft.build.framework.itaskitem.aspx)[]** parameter.\nCreates a link to a .NET Framework resource in the output file; the resource file is not placed in the output file. This parameter corresponds to the [/linkresource](https://msdn.microsoft.com/en-us/library/3y8xhb5d.aspx) switch of the vbc.exe compiler.`
        }),
        new AttributeSchema({
            name: "MainEntryPoint",
            description: `Optional **String** parameter.\nSpecifies the class or module that contains the *Sub Main* procedure. This parameter corresonds to the [/main](https://msdn.microsoft.com/en-us/library/y4bwckbb.aspx) switch of the vbc.exe compiler.`
        }),
        new AttributeSchema({
            name: "ModuleAssemblyName",
            description: `Optional **String** parameter.\nSpecifies the assembly that this module is a part of.`
        }),
        new AttributeSchema({
            name: "NoConfig",
            description: `Optional **Boolean** parameter.\nSpecifies that the compiler should not use the vbc.rsp file. This parameter corresponds to the [/noconfig](https://msdn.microsoft.com/en-us/library/306d4b08.aspx) parameter of the vbc.exe compiler.`
        }),
        new AttributeSchema({
            name: "NoLogo",
            description: `Optional **Boolean** parameter.\nIf *true*, suppresses display of compiler banner information. This parameter corresponds to the [/nologo](https://msdn.microsoft.com/en-us/library/65ee2y8z.aspx) switch of the vbc.exe compiler.`
        }),
        new AttributeSchema({
            name: "NoStandardLib",
            description: `Optional **Boolean** parameter.\nCauses the compiler not to reference the standard libraries. This parameter corresponds to the [/nostdlib](https://msdn.microsoft.com/en-us/library/79e7wdtc.aspx) switch of the vbc.exe compiler.`
        }),
        new AttributeSchema({
            name: "NoVBRuntimeReference",
            description: `Optional **Boolean** parameter.\nInternal use only. If *true*, prevents the automatic reference to Microsoft.VisualBasic.dll..`
        }),
        new AttributeSchema({
            name: "NoWarnings",
            description: `Optional **Boolean** parameter.\nIf *true*, the task supresses all warnings. For more information, see [/nowarn](https://msdn.microsoft.com/en-us/library/c86sssa5.aspx).`
        }),
        new AttributeSchema({
            name: "Optimize",
            description: `Optional **Boolean** parameter.\nIf *true*, enables compiler optimizations. This parameter corresponds to the [/optimize](https://msdn.microsoft.com/en-us/library/yf8493s5.aspx) switch of the vbc.exe compiler.`
        }),
        new AttributeSchema({
            name: "OptionCompare",
            description: `Optional **String** parameter.\nSpecifies how string comparisons are made. This parameter can have the following values:\n- *binary*\n- *text*\n\nThe value *binary* specifies that the task uses binary string comparisons. The value *text* specifies that the task uses text string comparisons. The default value of this parameter is *binary*. This parameter corresponds to the [/optioncompare](https://msdn.microsoft.com/en-us/library/ttdf47et.aspx) switch of the vbc.exe compiler.`
        }),
        new AttributeSchema({
            name: "OptionExplicit",
            description: `Optional **Boolean** parameter.\nIf *true*, explicit declaration of variables is required. This parameter corresponds to the [/optionexplicit](https://msdn.microsoft.com/en-us/library/ayaf8c2k.aspx) switch of the vbc.exe compiler.`
        }),
        new AttributeSchema({
            name: "OptionInfer",
            description: `Optional **Boolean** parameter.\nIf *true*, allows type inference of variables.`
        }),
        new AttributeSchema({
            name: "OptionStrict",
            description: `Optional **Boolean** parameter.\nIf *true*, the task enforces strict type semantics to restrict implicit type conversions. This parameter corresponds to the [/optionstrict](https://msdn.microsoft.com/en-us/library/3wh7c190.aspx) switch of the vbc.exe compiler.`
        }),
        new AttributeSchema({
            name: "OptionStrictType",
            description: `Optional **String** parameter.\nSpecifies which strict type semantics generate a warning. Currently, only "custom" is supported. This parameter corresponds to the [/optionstrict](https://msdn.microsoft.com/en-us/library/3wh7c190.aspx) switch of the vbc.exe compiler.`
        }),
        new AttributeSchema({
            name: "OutputAssembly",
            description: `Optional **String** output parameter.\nSpecifies the name of the ouput file. This parameter corresponds to the [/out](https://msdn.microsoft.com/en-us/library/std9609e.aspx) switch of the vbc.exe compiler.`
        }),
        new AttributeSchema({
            name: "Platform",
            description: `Optional **String** parameter.\nSpecifies the processor platform to be targeted by the output file. This parameter can have a value of *x86*, *x64*, *Itanium*, or *anycpu*. Default is *anycpu*. This parameter corresponds to the [/platform](https://msdn.microsoft.com/en-us/library/8ck8e1y2.aspx) switch of the vbc.exe compiler.`
        }),
        new AttributeSchema({
            name: "References",
            description: `Optional **[ITaskItem](https://msdn.microsoft.com/en-us/library/microsoft.build.framework.itaskitem.aspx)[]** parameter.\nCauses the task to import public type information from the specified items into the current project. This parameter corresponds to the [/reference](https://msdn.microsoft.com/en-us/library/czhbsf4x.aspx) switch of the vbc.exe compiler.`
        }),
        new AttributeSchema({
            name: "RemoveIntegerChecks",
            description: `Optional **Boolean** parameter.\nIf *true*, disables integer overflow error checks. The default value is *false*. This parameter corresponds to the [/removeintchecks](https://msdn.microsoft.com/en-us/library/key2x70f.aspx) switch of the vbc.exe compiler.`
        }),
        new AttributeSchema({
            name: "Resources",
            description: `Optional **[ITaskItem](https://msdn.microsoft.com/en-us/library/microsoft.build.framework.itaskitem.aspx)[]** parameter.\nEmbeds a .NET Framework resource into the output file. This parameter corresponds to the [/resource](https://msdn.microsoft.com/en-us/library/d2910c0e.aspx) switch of the vbc.exe compiler.`
        }),
        new AttributeSchema({
            name: "ResponseFiles",
            description: `Optional **[ITaskItem](https://msdn.microsoft.com/en-us/library/microsoft.build.framework.itaskitem.aspx)[]** parameter.\nSpecifies the response file that contains commands for this task. This parameter corresponds to the [@ (Specify Response File)](https://msdn.microsoft.com/en-us/library/37ckyyw5.aspx) option of the vbc.exe compiler.`
        }),
        new AttributeSchema({
            name: "RootNamespace",
            description: `Optional **String** parameter.\nSpecifies the root namespace for all type declarations. This parameter corresponds to the [/rootnamespace](https://msdn.microsoft.com/en-us/library/58kxttdx.aspx) switch of the vbc.exe compiler.`
        }),
        new AttributeSchema({
            name: "SdkPath",
            description: `Optional String parameter.\nSpecifies the location of mscorlib.dll and microsoft.visualbasic.dll. This parameter corresponds to the [/sdkpath](https://msdn.microsoft.com/en-us/library/yt4d47x1.aspx) switch of the vbc.exe compiler.`
        }),
        new AttributeSchema({
            name: "Sources",
            description: `Optional **[ITaskItem](https://msdn.microsoft.com/en-us/library/microsoft.build.framework.itaskitem.aspx)[]** parameter.\nSpecifies one or more Visual Basic source files.`
        }),
        new AttributeSchema({
            name: "TargetCompactFramework",
            description: `Optional **Boolean** parameter.\nIf *true*, the task targets the .NET Compact Framework. This switch corresponds to the [/netcf](https://msdn.microsoft.com/en-us/library/s7wb4kfs.aspx) switch of the vbc.exe compiler.`
        }),
        new AttributeSchema({
            name: "TargetType",
            description: `Optional **String** parameter.\nSpecifies the file format of the output file. This parameter can have a value of *library*, which creates a code library, *exe*, which creates a console application, *module*, which creates a module, or *winexe*, which creates a Windows program. Default is *library*. This parameter corresponds to the [/target](https://msdn.microsoft.com/en-us/library/31xs5fhx.aspx) switch of the vbc.exe compiler.`
        }),
        new AttributeSchema({
            name: "Timeout",
            description: `Optional **Int32** parameter.\nSpecifies the amount of time, in milliseconds, after which the task executable is terminated. The default value is *Int.MaxValue*, indicating that there is no time out period.`
        }),
        new AttributeSchema({
            name: "ToolPath",
            description: `Optional **String** parameter.\nSpecifies the location from where the task will load the underlying executable file (vbc.exe). If this parameter is not specified, the task uses the SDK installation path corresponding to the version of the framework that is running MSBuild.`
        }),
        new AttributeSchema({
            name: "TreatWarningsAsErrors",
            description: `Optional **Boolean** parameter.\nIf *true*, all warnings are treated as errors. For more information, see [/warnaserror (Visual Basic)](https://msdn.microsoft.com/en-us/library/2xz9dxe5.aspx).`
        }),
        new AttributeSchema({
            name: "UseHostCompilerIfAvailable",
            description: `Optional **Boolean** parameter.\nInstructs the task to use the in-process compiler object, if available. Used only by Visual Studio.`
        }),
        new AttributeSchema({
            name: "Utf8Output",
            description: `Optional **Boolean** parameter.\nLogs compiler output using UTF-8 encoding. This parameter corresponds to the [/utf8output](https://msdn.microsoft.com/en-us/library/7f764kwk.aspx) switch of the vbc.exe compiler.`
        }),
        new AttributeSchema({
            name: "Verbosity",
            description: `Optional **String** parameter.\nSpecifies the verbosity of the compiler’s output. Verbosity can be *Quiet*, *Normal* (the default), or *Verbose*.`
        }),
        new AttributeSchema({
            name: "WarningsAsErrors",
            description: `Optional **String** parameter.\nSpecifies a list of warnings to treat as errors. For more information, see [/warnaserror (Visual Basic)](https://msdn.microsoft.com/en-us/library/2xz9dxe5.aspx).\nThis parameter overrides the *TreatWarningsAsErrors* parameter.`
        }),
        new AttributeSchema({
            name: "WarningsNotAsErrors",
            description: `Optional **String** parameter.\nSpecifies a list of warnings that are not treated as errors. For more information, see [/warnaserror (Visual Basic)](https://msdn.microsoft.com/en-us/library/2xz9dxe5.aspx).\nThis parameter is only useful if the *TreatWarningsAsErrors* parameter is set to *true*.`
        }),
        new AttributeSchema({
            name: "Win32Icon",
            description: `Optional **String** parameter.\nInserts an .ico file in the assembly, which gives the output file the desired appearance in File Explorer. This parameter corresponds to the [/win32icon](https://msdn.microsoft.com/en-us/library/683be552.aspx) switch of the vbc.exe compiler.`
        }),
        new AttributeSchema({
            name: "Win32Resources",
            description: `Optional **String** parameter.\nInserts a Win32 resource (.res) file in the output file. This parameter corresponds to the [/win32resource](https://msdn.microsoft.com/en-us/library/kcktekk7.aspx) switch of the vbc.exe compiler.`
        })
    ]
});

const vcMessageTaskSchema = new TaskSchema({
    name: "VCMessage",
    description: "Logs warning and error messages during a build.",
    msdn: "https://msdn.microsoft.com/en-us/library/ee862479.aspx",
    attributes: [
        new AttributeSchema({
            name: "Arguments",
            description: `Optional **String** parameter.\nA semicolon-delimited list of messages to display.`
        }),
        new AttributeSchema({
            name: "Code",
            description: `Required **String** parameter.\nAn error number that qualifies the message.`,
            required: true
        }),
        new AttributeSchema({
            name: "Type",
            description: `Optional **String** parameter.\nSpecifies the kind of message to emit. Specify either "*Warning*" to emit a warning message, or "*Error*" to emit an error message.`
        })
    ]
});

const warningTaskSchema = new TaskSchema({
    name: "Warning",
    description: `Logs a warning during a build based on an evaluated conditional statement.\nThe *Warning* task allows MSBuild projects to check for the presence of a required configuration or property before proceeding with the next build step.\nIf the *Condition* parameter of the *Warning* task evaluates to *true*, the value of the *Text* parameter is logged and the build continues to execute. If a *Condition* parameter does not exisit, the warning text is logged. For more information on logging, see [Obtaining Build Logs](https://msdn.microsoft.com/en-us/library/ms171470.aspx).`,
    msdn: "https://msdn.microsoft.com/en-us/library/92775st5.aspx",
    attributes: [
        new AttributeSchema({
            name: "Code",
            description: `Optional **String** parameter.\nThe warning code to associate with the warning.`
        }),
        new AttributeSchema({
            name: "File",
            description: `Optional **String** parameter.\nSpecifies the relevant file, if any. If no file is provided, the file containing the Warning task is used.`
        }),
        new AttributeSchema({
            name: "HelpKeyword",
            description: `Optional **String** parameter.\nThe Help keyword to associate with the warning.`
        }),
        new AttributeSchema({
            name: "Text",
            description: `Optional **String** parameter.\nThe warning text that MSBuild logs if the Condition parameter evaluates to *true*.`
        })
    ]
});

const writeCodeFragmentTaskSchema = new TaskSchema({
    name: "WriteCodeFragment",
    description: `Generates a temporary code file from the specified generated code fragment. Does not delete the file.`,
    msdn: "https://msdn.microsoft.com/en-us/library/ff598685.aspx",
    attributes: [
        new AttributeSchema({
            name: "AssemblyAttributes",
            description: `Optional **[ITaskItem](https://msdn.microsoft.com/en-us/library/microsoft.build.framework.itaskitem.aspx)[]** parameter.\nDescription of the attributes to write. The item *Include* value is the full type name of the attribute, for example, "System.AssemblyVersionAttribute".\nEach metadata is the name-value pair of a parameter, which must be of type *String*. Some attributes only allow positional constructor arguments. However, you can use such arguments in any attribute. To set positional constructor attributes, use metadata names that resemble "_Parameter1", "_Parameter2", and so on.\nA parameter index cannot be skipped.`
        }),
        new AttributeSchema({
            name: "Language",
            description: `Required **String** parameter.\nSpecifies the language of the code to generate.\n*Language* can be any language for which a CodeDom provider is available, for example, "C#" or "VisualBasic". The emitted file will have the default file name extension for that language.`,
            required: true
        }),
        new AttributeSchema({
            name: "OutputDirectory",
            description: `Optional **[ITaskItem](https://msdn.microsoft.com/en-us/library/microsoft.build.framework.itaskitem.aspx)** parameter.\nSpecifies the destination folder for the generated code, typically the intermediate folder.`
        }),
        new AttributeSchema({
            name: "OutputFile",
            description: `Optional **[ITaskItem](https://msdn.microsoft.com/en-us/library/microsoft.build.framework.itaskitem.aspx)** output parameter.\nSpecifies the path of the file that was generated. If this parameter is set by using a file name, the destination folder is prepended to the file name. If it is set by using a root, the destination folder is ignored.\nIf this parameter is not set, the output file name is the destination folder, an arbitrary file name, and the default file name extension for the specified language.`
        })
    ]
});

const writeLinesToFileTaskSchema = new TaskSchema({
    name: "WriteLinesToFile",
    description: `Writes the paths of the specified items to the specified text file.\nIf *Overwrite* is *true*, creates a new file, write the contents to the file, and then closes the file. If the target file already exists, it is overwritten. If *Overwrite* is *false*, appends the contents to file, creating the target file if it does not already exist.`,
    msdn: "https://msdn.microsoft.com/en-us/library/ms164305.aspx",
    attributes: [
        new AttributeSchema({
            name: "File",
            description: `Required **[ITaskItem](https://msdn.microsoft.com/en-us/library/microsoft.build.framework.itaskitem.aspx)** parameter.\nSpecifies the file to write the items to.`,
            required: true
        }),
        new AttributeSchema({
            name: "Lines",
            description: `Optional **[ITaskItem](https://msdn.microsoft.com/en-us/library/microsoft.build.framework.itaskitem.aspx)[]** parameter.\nSpecifies the items to write to the file.`
        }),
        new AttributeSchema({
            name: "Overwrite",
            description: `Optional **Boolean** parameter.\nIf *true*, the task overwrites any existing content in the file.`
        }),
        new AttributeSchema({
            name: "Encoding",
            description: `Optional **String** parameter.\nSelects the character encoding, for example, "Unicode". See also [Encoding](https://msdn.microsoft.com/en-us/library/system.text.encoding.aspx).`
        })
    ]
});

const xdcmakeTaskSchema = new TaskSchema({
    name: "XDCMake",
    description: `Wraps the XML Documentation tool (xdcmake.exe), which merges XML document comment (.xdc) files into an .xml file.\nAn .xdc file is created when you provide documentation comments in your Visual C++ source code and compile by using the [/doc](https://msdn.microsoft.com/en-us/library/ms173501.aspx) compiler option. For more information, see [XDCMake Reference, XML Document Generator Tool Property Pages](https://msdn.microsoft.com/en-us/library/ms177247.aspx), and command-line help option (**/?**) for xdcmake.exe.\nBy default, the xdcmake.exe tool supports a few command-line options. Additional options are supported when you specify the **/old** command-line option.`,
    msdn: "https://msdn.microsoft.com/en-us/library/ee862480.aspx",
    attributes: [
        new AttributeSchema({
            name: "AdditionalDocumentFile",
            description: `Optional **String[]** parameter.\nSpecifies one or more additional .xdc files to merge.\nFor more information, see the **Additional Document Files** description in [XML Document Generator Tool Property Pages](https://msdn.microsoft.com/en-us/library/ms235515.aspx). Also see the **/old** and **/Fs** command-line options for xdcmake.exe.`
        }),
        new AttributeSchema({
            name: "AdditionalOptions",
            description: `Optional **String** parameter.\nA list of options as specified on the command line. For example, "*/option1 /option2 /option#*". Use this parameter to specify options that are not represented by any other **XDCMake** task parameter.\nFor more information, see [XDCMake Reference, XML Document Generator Tool Property Pages](https://msdn.microsoft.com/en-us/library/ms177247.aspx), and command-line help (**/?**) for xdcmake.exe.`
        }),
        new AttributeSchema({
            name: "DocumentLibraryDependencies",
            description: `Optional **Boolean** parameter.\nIf *true* and the current project has a dependency on a static library (.lib) project in the solution, the .xdc files for that library project are included in the .xml file output for the current project.\nFor more information, see the **Document Library Dependencies** description in [XML Document Generator Tool Property Pages](https://msdn.microsoft.com/en-us/library/ms235515.aspx).`
        }),
        new AttributeSchema({
            name: "OutputFile",
            description: `Optional **String** parameter.\nOverrides the default output file name. The default name is derived from the name of the first .xdc file that is processed.\nFor more information, see the **/out:***filename* option in [XDCMake Reference](https://msdn.microsoft.com/en-us/library/ms177247.aspx). Also see the **/old** and **/Fo** command-line options for xdcmake.exe.`
        }),
        new AttributeSchema({
            name: "ProjectName",
            description: `Optional **String** parameter.\nThe name of the current project.`
        }),
        new AttributeSchema({
            name: "SlashOld",
            description: `Optional **Boolean** parameter.\nIf *true*, enables additional xdcmake.exe options.\nFor more information, see the **/old** command-line option for xdcmake.exe.`
        }),
        new AttributeSchema({
            name: "Sources",
            description: `Required **[ITaskItem](https://msdn.microsoft.com/en-us/library/microsoft.build.framework.itaskitem.aspx)[]** parameter.\nDefines an array of MSBuild source file items that can be consumed and emitted by tasks.`,
            required: true
        }),
        new AttributeSchema({
            name: "SuppressStartupBanner",
            description: `Optional **Boolean** parameter.\nIf *true*, prevents the display of the copyright and version number message when the task starts.\nFor more information, see the **/nologo** option in [XDCMake Reference](https://msdn.microsoft.com/en-us/library/ms177247.aspx).`
        }),
        new AttributeSchema({
            name: "TrackerLogDirectory",
            description: `Optional **String** parameter.\nSpecifies the directory for the tracker log.`
        })
    ]
});

const xmlPeekTaskSchema = new TaskSchema({
    name: "XmlPeek",
    description: `Returns values as specified by XPath Query from an XML file.`,
    msdn: "https://msdn.microsoft.com/en-us/library/ff598684.aspx",
    attributes: [
        new AttributeSchema({
            name: "Namespaces",
            description: `Optional **String** parameter.\nSpecifies the namespaces for the XPath query prefixes.`
        }),
        new AttributeSchema({
            name: "Query",
            description: `Optional **String** parameter.\nSpecifies the XPath query.`
        }),
        new AttributeSchema({
            name: "Result",
            description: `Optional **[ITaskItem](https://msdn.microsoft.com/en-us/library/microsoft.build.framework.itaskitem.aspx)[]** output parameter.\nContains the results that are returned by this task.`
        }),
        new AttributeSchema({
            name: "XmlContent",
            description: `Optional **String** parameter.\nSpecifies the XML input as a string.`
        }),
        new AttributeSchema({
            name: "XmlInputPath",
            description: `Optional **[ITaskItem](https://msdn.microsoft.com/en-us/library/microsoft.build.framework.itaskitem.aspx)** parameter.\nSpecifies the XML input as a file path.`
        })
    ]
});

const xmlPokeTaskSchema = new TaskSchema({
    name: "XmlPoke",
    description: `Sets values as specified by an XPath query into an XML file.`,
    msdn: `https://msdn.microsoft.com/en-us/library/ff598687.aspx`,
    attributes: [
        new AttributeSchema({
            name: "Namespaces",
            description: `Optional **String** parameter.\nSpecifies the namespaces for XPath query prefixes.`
        }),
        new AttributeSchema({
            name: "Query",
            description: `Optional **String** parameter.\nSpecifies the XPath query.`
        }),
        new AttributeSchema({
            name: "Value",
            description: `Required **[ITaskItem](https://msdn.microsoft.com/en-us/library/microsoft.build.framework.itaskitem.aspx)** parameter.\nSpecifies the output file.`,
            required: true
        }),
        new AttributeSchema({
            name: "XmlInputPath",
            description: `Optional **[ITaskItem](https://msdn.microsoft.com/en-us/library/microsoft.build.framework.itaskitem.aspx)** parameter.\nSpecifies the XML input as a file path.`
        })
    ]
});

const xsdTaskSchema = new TaskSchema({
    name: "XSD",
    description: `Wraps the XML Schema Definition tool (xsd.exe), which generates schema or class files from a source.`,
    msdn: "https://msdn.microsoft.com/en-us/library/ee862472.aspx",
    attributes: [
        new AttributeSchema({
            name: "AdditionalOptions",
            description: `Optional **String** parameter.\nA list of options as specified on the command line. For example, "*/option1 /option2 /option#*". Use this parameter to specify options that are not represented by any other **XSD** task parameter.`
        }),
        new AttributeSchema({
            name: "GenerateFromSchema",
            description: `Optional **String** parameter.\nSpecifies the types that are generated from the specified schema.\nSpecify one of the following values, each of which corresponds to an XSD option.\n- **classes** - **/classes**\n- **dataset** - **/dataset**`
        }),
        new AttributeSchema({
            name: "Language",
            description: `Optional **String** parameter.\nSpecifies the programming language to use for the generated code.\nChoose from **CS** (C#, which is the default), **VB** (Visual Basic), or **JS** (JScript). You can also specify a fully qualified name for a class that implements *System.CodeDom.Compiler.CodeDomProvider* Class.`
        }),
        new AttributeSchema({
            name: "Namespace",
            description: `Optional **String** parameter.\nSpecifies the runtime namespace for the generated types.`
        }),
        new AttributeSchema({
            name: "Sources",
            description: `Required **[ITaskItem](https://msdn.microsoft.com/en-us/library/microsoft.build.framework.itaskitem.aspx)[]** parameter.\nDefines an array of MSBuild source file items that can be consumed and emitted by tasks.`,
            required: true
        }),
        new AttributeSchema({
            name: "SuppressStartupBanner",
            description: `Optional **Boolean** parameter.\nIf *true*, prevents the display of the copyright and version number message when the task starts.`
        }),
        new AttributeSchema({
            name: "TrackerLogDirectory",
            description: `Optional **String** parameter.\nSpecifies the directory for the tracker log.`
        })
    ]
});

const xslTransformationTaskSchema = new TaskSchema({
    name: "XslTransformation",
    description: `Transforms an XML input by using an XSLT or compiled XSLT and outputs to an output device or a file.`,
    msdn: "https://msdn.microsoft.com/en-us/library/ff598688.aspx",
    attributes: [
        new AttributeSchema({
            name: "OutputPaths",
            description: `Required **[ITaskItem](https://msdn.microsoft.com/en-us/library/microsoft.build.framework.itaskitem.aspx)[]** parameter.\nSpecifies the output files for the XML transformation.`,
            required: true
        }),
        new AttributeSchema({
            name: "Parameters",
            description: `Optional **String** parameter.\nSpecifies the parameters to the XSLT Input document.`
        }),
        new AttributeSchema({
            name: "XmlContent",
            description: `Optional **String** parameter.\nSpecifies the XML input as a string.`
        }),
        new AttributeSchema({
            name: "XmlInputPaths",
            description: `Optional **[ITaskItem](https://msdn.microsoft.com/en-us/library/microsoft.build.framework.itaskitem.aspx)[]** parameter.\nSpecifies the XML input files.`
        }),
        new AttributeSchema({
            name: "XslCompiledDllPath",
            description: `Optional **[ITaskItem](https://msdn.microsoft.com/en-us/library/microsoft.build.framework.itaskitem.aspx)** parameter.\nSpecifies the compiled XSLT.`
        }),
        new AttributeSchema({
            name: "XslContent",
            description: `Optional **String** parameter.\nSpecifies the XSLT input as a string.`
        }),
        new AttributeSchema({
            name: "XslInputPath",
            description: `Optional **[ITaskItem](https://msdn.microsoft.com/en-us/library/microsoft.build.framework.itaskitem.aspx)** parameter.\nSpecifies the XSLT input file.`
        })
    ]
});

const unrecognizedTaskSchema = new TaskSchema({
    name: "Task",
    description: "Creates and executes an instance of an MSBuild task. The element name is determined by the name of the task being created.",
    msdn: "https://msdn.microsoft.com/en-us/library/77f2hx1s.aspx",
    allowAllAttributes: true
});

export const taskSchemas: qub.Iterable<TaskSchema> = new qub.ArrayList<TaskSchema>([
    alTaskSchema,
    aspNetCompilerTaskSchema,
    assignCultureTaskSchema,
    assignProjectConfigurationTaskSchema,
    assignTargetPathTaskSchema,
    bscMakeTaskSchema,
    callTargetTaskSchema,
    clTaskSchema,
    combinePathTaskSchema,
    convertToAbsolutePathTaskSchema,
    copyTaskSchema,
    cppCleanTaskSchema,
    createCSharpManifestResourceNameTaskSchema,
    createItemTaskSchema,
    createPropertyTaskSchema,
    createVisualBasicManifestResourceNameTaskSchema,
    cscTaskSchema,
    deleteTaskSchema,
    errorTaskSchema,
    execTaskSchema,
    findAppConfigFileTaskSchema,
    findInListTaskSchema,
    findUnderPathTaskSchema,
    formatUrlTaskSchema,
    formatVersionTaskSchema,
    generateApplicationManifestTaskSchema,
    generateBootstrapperTaskSchema,
    generateDeploymentManifestTaskSchema,
    generateResourceTaskSchema,
    generateTrustInfoTaskSchema,
    getAssemblyIdentityTaskSchema,
    getFrameworkPathTaskSchema,
    getFrameworkSdkPathTaskSchema,
    getReferenceAssemblyPathsTaskSchema,
    lcTaskSchema,
    libTaskSchema,
    linkTaskSchema,
    makeDirTaskSchema,
    messageTaskSchema,
    midlTaskSchema,
    moveTaskSchema,
    msbuildTaskSchema,
    mtTaskSchema,
    rcTaskSchema,
    readLinesFromFileTaskSchema,
    registerAssemblyTaskSchema,
    removeDirTaskSchema,
    removeDuplicatesTaskSchema,
    requiresFramework35SP1AssemblyTaskSchema,
    resolveAssemblyReferenceTaskSchema,
    resolveComReferenceTaskSchema,
    resolveKeySourceTaskSchema,
    resolveManifestFilesTaskSchema,
    resolveNativeReferenceTaskSchema,
    resolveNonMSBuildProjectOutputTaskSchema,
    setEnvTaskSchema,
    sgenTaskSchema,
    signFileTaskSchema,
    touchTaskSchema,
    unregisterAssemblyTaskSchema,
    updateManifestTaskSchema,
    vbcTaskSchema,
    vcMessageTaskSchema,
    warningTaskSchema,
    writeCodeFragmentTaskSchema,
    writeLinesToFileTaskSchema,
    xdcmakeTaskSchema,
    xmlPeekTaskSchema,
    xmlPokeTaskSchema,
    xsdTaskSchema,
    xslTransformationTaskSchema
]);

export function getElementSchema(elementType: ElementType, elementName?: string): ElementSchema {
    let result: ElementSchema;

    switch (elementType) {
        case ElementType.Choose:
            result = chooseElementSchema;
            break;

        case ElementType.Import:
            result = importSchema;
            break;

        case ElementType.ImportGroup:
            result = importGroupSchema;
            break;

        case ElementType.Item:
            result = itemSchema;
            break;

        case ElementType.ItemDefinitionGroup:
            result = itemDefinitionGroupSchema;
            break;

        case ElementType.ItemGroup:
            result = itemGroupSchema;
            break;

        case ElementType.ItemMetadata:
            result = itemMetadataSchema;
            break;

        case ElementType.OnError:
            result = onErrorSchema;
            break;

        case ElementType.Otherwise:
            result = otherwiseSchema;
            break;

        case ElementType.Output:
            result = outputSchema;
            break;

        case ElementType.Parameter:
            result = parameterSchema;
            break;

        case ElementType.ParameterGroup:
            result = parameterGroupSchema;
            break;

        case ElementType.Project:
            result = projectSchema;
            break;

        case ElementType.ProjectExtensions:
            result = projectExtensionsSchema;
            break;

        case ElementType.Property:
            result = propertySchema;
            break;

        case ElementType.PropertyGroup:
            result = propertyGroupSchema;
            break;

        case ElementType.Target:
            result = targetSchema
            break;

        case ElementType.TargetItem:
            result = targetItemSchema;
            break;

        case ElementType.TargetItemGroup:
            result = targetItemGroupSchema;
            break;

        case ElementType.Task:
            result = getTaskSchema(elementName);
            break;

        case ElementType.TaskBody:
            result = taskBodySchema;
            break;

        case ElementType.UsingTask:
            result = usingTaskSchema;
            break;

        case ElementType.When:
            result = whenElementSchema;
            break;

        default:
            break;
    }

    return result;
}

export function getTaskSchema(taskName: string): TaskSchema {
    let result: TaskSchema = taskSchemas.first((taskSchema: TaskSchema) => matchesString(taskSchema.name, taskName));
    if (!result) {
        result = unrecognizedTaskSchema;
    }
    return result;
}