var documenterSearchIndex = {"docs":
[{"location":"eval/#Evaluation","page":"Evaluation","title":"Evaluation","text":"","category":"section"},{"location":"eval/","page":"Evaluation","title":"Evaluation","text":"Given an expression tree specified with a Node type, you may evaluate the expression over an array of data with the following command:","category":"page"},{"location":"eval/","page":"Evaluation","title":"Evaluation","text":"eval_tree_array(tree::Node{T}, cX::AbstractMatrix{T}, operators::OperatorEnum) where {T<:Real}","category":"page"},{"location":"eval/#DynamicExpressions.EvaluateEquationModule.eval_tree_array-Union{Tuple{T}, Tuple{Node{T}, AbstractMatrix{T}, OperatorEnum}} where T<:Real","page":"Evaluation","title":"DynamicExpressions.EvaluateEquationModule.eval_tree_array","text":"eval_tree_array(tree::Node, cX::AbstractMatrix{T}, operators::OperatorEnum)\n\nEvaluate a binary tree (equation) over a given input data matrix. The operators contain all of the operators used. This function fuses doublets and triplets of operations for lower memory usage.\n\nThis function can be represented by the following pseudocode:\n\nfunction eval(current_node)\n    if current_node is leaf\n        return current_node.value\n    elif current_node is degree 1\n        return current_node.operator(eval(current_node.left_child))\n    else\n        return current_node.operator(eval(current_node.left_child), eval(current_node.right_child))\n\nThe bulk of the code is for optimizations and pre-emptive NaN/Inf checks, which speed up evaluation significantly.\n\nReturns\n\n(output, complete)::Tuple{AbstractVector{T}, Bool}: the result,   which is a 1D array, as well as if the evaluation completed   successfully (true/false). A false complete means an infinity   or nan was encountered, and a large loss should be assigned   to the equation.\n\n\n\n\n\n","category":"method"},{"location":"eval/","page":"Evaluation","title":"Evaluation","text":"Assuming you are only using a single OperatorEnum, you can also use the following short-hand by using the expression as a function:","category":"page"},{"location":"eval/","page":"Evaluation","title":"Evaluation","text":"operators = OperatorEnum(; binary_operators=[+, -, *], unary_operators=[cos])\ntree = Node(; feature=1) * cos(Node(; feature=2) - 3.2)\n\ntree(X)","category":"page"},{"location":"eval/","page":"Evaluation","title":"Evaluation","text":"This is possible because when you call OperatorEnum, it automatically re-defines (::Node)(X) to call the evaluation operation with the given operators loaded. It also re-definesprint,show, and the various operators, to work with theNode` type.","category":"page"},{"location":"eval/","page":"Evaluation","title":"Evaluation","text":"warning: Warning\nThe Node type does not know about which OperatorEnum you used to create it. Thus, if you define an expression with one OperatorEnum, and then try to evaluate it or print it with a different OperatorEnum, you will get undefined behavior!","category":"page"},{"location":"eval/","page":"Evaluation","title":"Evaluation","text":"You can also work with arbitrary types, by defining a GenericOperatorEnum instead. The notation is the same for eval_tree_array, though it will return nothing when it can't find a method, and not do any NaN checks:","category":"page"},{"location":"eval/","page":"Evaluation","title":"Evaluation","text":"    eval_tree_array(tree, cX::AbstractArray{T,N}, operators::GenericOperatorEnum) where {T,N}","category":"page"},{"location":"eval/#DynamicExpressions.EvaluateEquationModule.eval_tree_array-Union{Tuple{N}, Tuple{T}, Tuple{Any, AbstractArray{T, N}, GenericOperatorEnum}} where {T, N}","page":"Evaluation","title":"DynamicExpressions.EvaluateEquationModule.eval_tree_array","text":"eval_tree_array(tree::Node, cX::AbstractMatrix{T,N}, operators::GenericOperatorEnum) where {T,N}\n\nEvaluate a generic binary tree (equation) over a given input data, whatever that input data may be. The operators enum contains all of the operators used. Unlike eval_tree_array with the normal OperatorEnum, the array cX is sliced only along the first dimension. i.e., if cX is a vector, then the output of a feature node will be a scalar. If cX is a 3D tensor, then the output of a feature node will be a 2D tensor. Note also that tree.feature will index along the first axis of cX.\n\nHowever, there is no requirement about input and output types in general. You may set up your tree such that some operator nodes work on tensors, while other operator nodes work on scalars. eval_tree_array will simply return nothing if a given operator is not defined for the given input type.\n\nThis function can be represented by the following pseudocode:\n\nfunction eval(current_node)\n    if current_node is leaf\n        return current_node.value\n    elif current_node is degree 1\n        return current_node.operator(eval(current_node.left_child))\n    else\n        return current_node.operator(eval(current_node.left_child), eval(current_node.right_child))\n\nReturns\n\n(output, complete)::Tuple{Any, Bool}: the result,   as well as if the evaluation completed successfully (true/false).   If evaluation failed, nothing will be returned for the first argument.   A false complete means an operator was called on input types   that it was not defined for.\n\n\n\n\n\n","category":"method"},{"location":"eval/#Derivatives","page":"Evaluation","title":"Derivatives","text":"","category":"section"},{"location":"eval/","page":"Evaluation","title":"Evaluation","text":"DynamicExpressions.jl can efficiently compute first-order derivatives of expressions with respect to variables or constants. This is done using either eval_diff_tree_array, to compute derivative with respect to a single variable, or with eval_grad_tree_array, to compute the gradient with respect all variables (or, all constants). Both use forward-mode automatic, but use Zygote.jl to compute derivatives of each operator, so this is very efficient.","category":"page"},{"location":"eval/","page":"Evaluation","title":"Evaluation","text":"eval_diff_tree_array(tree::Node{T}, cX::AbstractMatrix{T}, operators::OperatorEnum, direction::Int) where {T<:Real}\neval_grad_tree_array(tree::Node{T}, cX::AbstractMatrix{T}, operators::OperatorEnum; variable::Bool=false) where {T<:Real}","category":"page"},{"location":"eval/#DynamicExpressions.EvaluateEquationDerivativeModule.eval_diff_tree_array-Union{Tuple{T}, Tuple{Node{T}, AbstractMatrix{T}, OperatorEnum, Int64}} where T<:Real","page":"Evaluation","title":"DynamicExpressions.EvaluateEquationDerivativeModule.eval_diff_tree_array","text":"eval_diff_tree_array(tree::Node{T}, cX::AbstractMatrix{T}, operators::OperatorEnum, direction::Int)\n\nCompute the forward derivative of an expression, using a similar structure and optimization to evaltreearray. direction is the index of a particular variable in the expression. e.g., direction=1 would indicate derivative with respect to x1.\n\nArguments\n\ntree::Node: The expression tree to evaluate.\ncX::AbstractMatrix{T}: The data matrix, with each column being a data point.\noperators::OperatorEnum: The operators used to create the tree. Note that operators.enable_autodiff   must be true. This is needed to create the derivative operations.\ndirection::Int: The index of the variable to take the derivative with respect to.\n\nReturns\n\n(evaluation, derivative, complete)::Tuple{AbstractVector{T}, AbstractVector{T}, Bool}: the normal evaluation,   the derivative, and whether the evaluation completed as normal (or encountered a nan or inf).\n\n\n\n\n\n","category":"method"},{"location":"eval/#DynamicExpressions.EvaluateEquationDerivativeModule.eval_grad_tree_array-Union{Tuple{T}, Tuple{Node{T}, AbstractMatrix{T}, OperatorEnum}} where T<:Real","page":"Evaluation","title":"DynamicExpressions.EvaluateEquationDerivativeModule.eval_grad_tree_array","text":"eval_grad_tree_array(tree::Node{T}, cX::AbstractMatrix{T}, operators::OperatorEnum; variable::Bool=false)\n\nCompute the forward-mode derivative of an expression, using a similar structure and optimization to evaltreearray. variable specifies whether we should take derivatives with respect to features (i.e., cX), or with respect to every constant in the expression.\n\nArguments\n\ntree::Node{T}: The expression tree to evaluate.\ncX::AbstractMatrix{T}: The data matrix, with each column being a data point.\noperators::OperatorEnum: The operators used to create the tree. Note that operators.enable_autodiff   must be true. This is needed to create the derivative operations.\nvariable::Bool: Whether to take derivatives with respect to features (i.e., cX - with variable=true),   or with respect to every constant in the expression (variable=false).\n\nReturns\n\n(evaluation, gradient, complete)::Tuple{AbstractVector{T}, AbstractMatrix{T}, Bool}: the normal evaluation,   the gradient, and whether the evaluation completed as normal (or encountered a nan or inf).\n\n\n\n\n\n","category":"method"},{"location":"eval/","page":"Evaluation","title":"Evaluation","text":"Alternatively, you can compute higher-order derivatives by using ForwardDiff on the function differentiable_eval_tree_array, although this will be slower.","category":"page"},{"location":"eval/","page":"Evaluation","title":"Evaluation","text":"differentiable_eval_tree_array(tree::Node{T}, cX::AbstractMatrix{T}, operators::OperatorEnum) where {T<:Real}","category":"page"},{"location":"eval/#DynamicExpressions.EvaluateEquationModule.differentiable_eval_tree_array-Union{Tuple{T}, Tuple{Node{T}, AbstractMatrix{T}, OperatorEnum}} where T<:Real","page":"Evaluation","title":"DynamicExpressions.EvaluateEquationModule.differentiable_eval_tree_array","text":"differentiable_eval_tree_array(tree::Node, cX::AbstractMatrix, operators::OperatorEnum)\n\nEvaluate an expression tree in a way that can be auto-differentiated.\n\n\n\n\n\n","category":"method"},{"location":"eval/#Printing","page":"Evaluation","title":"Printing","text":"","category":"section"},{"location":"eval/","page":"Evaluation","title":"Evaluation","text":"You can also print a tree as follows:","category":"page"},{"location":"eval/","page":"Evaluation","title":"Evaluation","text":"string_tree(tree::Node, operators::AbstractOperatorEnum)","category":"page"},{"location":"eval/#DynamicExpressions.EquationModule.string_tree-Tuple{Node, AbstractOperatorEnum}","page":"Evaluation","title":"DynamicExpressions.EquationModule.string_tree","text":"string_tree(tree::Node, operators::AbstractOperatorEnum; kws...)\n\nConvert an equation to a string.\n\nArguments\n\nvarMap::Union{Array{String, 1}, Nothing}=nothing: what variables   to print for each feature.\n\n\n\n\n\n","category":"method"},{"location":"eval/","page":"Evaluation","title":"Evaluation","text":"When you define an OperatorEnum, the standard show and print methods will be overwritten to use string_tree.","category":"page"},{"location":"","page":"Contents","title":"Contents","text":"<div align=\"center\">","category":"page"},{"location":"","page":"Contents","title":"Contents","text":"<img src=\"https://user-images.githubusercontent.com/7593028/196523542-305f3fc2-18d2-41e5-9252-1f96c3d0b7e7.png\" height=\"50%\" width=\"50%\"></img>","category":"page"},{"location":"","page":"Contents","title":"Contents","text":"Ridiculously fast dynamic expressions.","category":"page"},{"location":"","page":"Contents","title":"Contents","text":"(Image: ) (Image: CI) (Image: Coverage Status)","category":"page"},{"location":"","page":"Contents","title":"Contents","text":"DynamicExpressions.jl is the backbone of  SymbolicRegression.jl and PySR.","category":"page"},{"location":"","page":"Contents","title":"Contents","text":"</div>","category":"page"},{"location":"#Summary","page":"Contents","title":"Summary","text":"","category":"section"},{"location":"","page":"Contents","title":"Contents","text":"A dynamic expression is a snippet of code that can change throughout runtime - compilation is not possible! DynamicExpressions.jl does the following:","category":"page"},{"location":"","page":"Contents","title":"Contents","text":"Defines an enum over user-specified operators.\nUsing this enum, it defines a very lightweight and type-stable data structure for arbitrary expressions.\nIt then generates specialized evaluation kernels for the space of potential operators.\nIt also generates kernels for the first-order derivatives, using Zygote.jl.\nIt can also operate on arbitrary other types (vectors, tensors, symbols, strings, etc.) - see last part below.","category":"page"},{"location":"","page":"Contents","title":"Contents","text":"It also has import and export functionality with SymbolicUtils.jl, so you can move your runtime expression into a CAS!","category":"page"},{"location":"#Example","page":"Contents","title":"Example","text":"","category":"section"},{"location":"","page":"Contents","title":"Contents","text":"using DynamicExpressions\n\noperators = OperatorEnum(; binary_operators=[+, -, *], unary_operators=[cos])\n\nx1 = Node(; feature=1)\nx2 = Node(; feature=2)\n\nexpression = x1 * cos(x2 - 3.2)\n\nX = randn(Float64, 2, 100);\nexpression(X) # 100-element Vector{Float64}","category":"page"},{"location":"","page":"Contents","title":"Contents","text":"(We can construct this expression with normal operators, since calling OperatorEnum() will @eval new functions on Node that use the specified enum.)","category":"page"},{"location":"#Speed","page":"Contents","title":"Speed","text":"","category":"section"},{"location":"","page":"Contents","title":"Contents","text":"First, what happens if we naively use Julia symbols to define and then evaluate this expression?","category":"page"},{"location":"","page":"Contents","title":"Contents","text":"@btime eval(:(X[1, :] .* cos.(X[2, :] .- 3.2)))\n# 117,000 ns","category":"page"},{"location":"","page":"Contents","title":"Contents","text":"This is quite slow, meaning it will be hard to quickly search over the space of expressions. Let's see how DynamicExpressions.jl compares:","category":"page"},{"location":"","page":"Contents","title":"Contents","text":"@btime expression(X)\n# 693 ns","category":"page"},{"location":"","page":"Contents","title":"Contents","text":"Much faster! And we didn't even need to compile it. (Internally, this is calling eval_tree_array(expression, X, operators) - where operators has been pre-defined when we called OperatorEnum()). ","category":"page"},{"location":"","page":"Contents","title":"Contents","text":"If we change expression dynamically with a random number generator, it will have the same performance:","category":"page"},{"location":"","page":"Contents","title":"Contents","text":"@btime begin\n    expression.op = rand(1:3)  # random operator in [+, -, *]\n    expression(X)\nend\n# 842 ns","category":"page"},{"location":"","page":"Contents","title":"Contents","text":"Now, let's see the performance if we had hard-coded these expressions:","category":"page"},{"location":"","page":"Contents","title":"Contents","text":"f(X) = X[1, :] .* cos.(X[2, :] .- 3.2)\n@btime f(X)\n# 708 ns","category":"page"},{"location":"","page":"Contents","title":"Contents","text":"So, our dynamic expression evaluation is about the same (or even a bit faster) as evaluating a basic hard-coded expression! Let's see if we can optimize the speed of the hard-coded version:","category":"page"},{"location":"","page":"Contents","title":"Contents","text":"f_optimized(X) = begin\n    y = Vector{Float64}(undef, 100)\n    @inbounds @simd for i=1:100\n        y[i] = X[1, i] * cos(X[2, i] - 3.2)\n    end\n    y\nend\n@btime f_optimized(X)\n# 526 ns","category":"page"},{"location":"","page":"Contents","title":"Contents","text":"The DynamicExpressions.jl version is only 25% slower than one which has been optimized by hand into a single SIMD kernel! Not bad at all.","category":"page"},{"location":"","page":"Contents","title":"Contents","text":"More importantly: we can change expression throughout runtime, and expect the same performance. This makes this data structure ideal for symbolic regression and other evaluation-based searches over expression trees.","category":"page"},{"location":"#Derivatives","page":"Contents","title":"Derivatives","text":"","category":"section"},{"location":"","page":"Contents","title":"Contents","text":"We can also compute gradients with the same speed:","category":"page"},{"location":"","page":"Contents","title":"Contents","text":"operators = OperatorEnum(;\n    binary_operators=[+, -, *],\n    unary_operators=[cos],\n    enable_autodiff=true,\n)\nx1 = Node(; feature=1)\nx2 = Node(; feature=2)\nexpression = x1 * cos(x2 - 3.2)","category":"page"},{"location":"","page":"Contents","title":"Contents","text":"We can take the gradient with respect to inputs with simply the ' character:","category":"page"},{"location":"","page":"Contents","title":"Contents","text":"grad = expression'(X)","category":"page"},{"location":"","page":"Contents","title":"Contents","text":"This is quite fast:","category":"page"},{"location":"","page":"Contents","title":"Contents","text":"@btime expression'(X)\n# 2894 ns","category":"page"},{"location":"","page":"Contents","title":"Contents","text":"and again, we can change this expression at runtime, without loss in performance!","category":"page"},{"location":"","page":"Contents","title":"Contents","text":"@btime begin\n    expression.op = rand(1:3)\n    expression'(X)\nend\n# 3198 ns","category":"page"},{"location":"","page":"Contents","title":"Contents","text":"Internally, this is calling the eval_grad_tree_array function, which performs forward-mode automatic differentiation on the expression tree with Zygote-compiled kernels. We can also compute the derivative with respect to constants:","category":"page"},{"location":"","page":"Contents","title":"Contents","text":"result, grad, did_finish = eval_grad_tree_array(expression, X, operators; variable=false)","category":"page"},{"location":"","page":"Contents","title":"Contents","text":"or with respect to variables, and only in a single direction:","category":"page"},{"location":"","page":"Contents","title":"Contents","text":"feature = 2\nresult, grad, did_finish = eval_diff_tree_array(expression, X, operators, feature)","category":"page"},{"location":"#Generic-types","page":"Contents","title":"Generic types","text":"","category":"section"},{"location":"","page":"Contents","title":"Contents","text":"Does this work for only scalar operators on real numbers, or will it work for MyCrazyType?","category":"page"},{"location":"","page":"Contents","title":"Contents","text":"I'm so glad you asked. DynamicExpressions.jl actually will work for arbitrary types! However, to work on operators other than real scalars, you need to use the GenericOperatorEnum instead of the normal OperatorEnum. Let's try it with strings!","category":"page"},{"location":"","page":"Contents","title":"Contents","text":"x1 = Node(String; feature=1) ","category":"page"},{"location":"","page":"Contents","title":"Contents","text":"This node, will be used to index input data (whatever it may be) with selectdim(data, 1, feature). Let's now define some operators to use:","category":"page"},{"location":"","page":"Contents","title":"Contents","text":"my_string_func(x::String) = \"Hello $x\"\n\noperators = GenericOperatorEnum(;\n    binary_operators=[*],\n    unary_operators=[my_string_func],\n    extend_user_operators=true)","category":"page"},{"location":"","page":"Contents","title":"Contents","text":"Now, let's create an expression:","category":"page"},{"location":"","page":"Contents","title":"Contents","text":"tree = x1 * \" World!\"\ntree([\"Hello\", \"Me?\"])\n# Hello World!","category":"page"},{"location":"","page":"Contents","title":"Contents","text":"So indeed it works for arbitrary types. It is a bit slower due to the potential for type instability, but it's not too bad:","category":"page"},{"location":"","page":"Contents","title":"Contents","text":"@btime tree([\"Hello\", \"Me?\"]\n# 1738 ns","category":"page"},{"location":"#Contents","page":"Contents","title":"Contents","text":"","category":"section"},{"location":"","page":"Contents","title":"Contents","text":"Pages = [\"types.md\", \"eval.md\"]","category":"page"},{"location":"types/#Types","page":"Types","title":"Types","text":"","category":"section"},{"location":"types/#Operator-Enum","page":"Types","title":"Operator Enum","text":"","category":"section"},{"location":"types/","page":"Types","title":"Types","text":"All equations are represented as a tree of operators. Each node in this tree specifies its operator with an integer - which indexes an enum of operators. This enum is defined as follows:","category":"page"},{"location":"types/","page":"Types","title":"Types","text":"OperatorEnum","category":"page"},{"location":"types/#DynamicExpressions.OperatorEnumModule.OperatorEnum","page":"Types","title":"DynamicExpressions.OperatorEnumModule.OperatorEnum","text":"OperatorEnum\n\nDefines an enum over operators, along with their derivatives.\n\nFields\n\nbinops: A tuple of binary operators. Real scalar input type.\nunaops: A tuple of unary operators. Real scalar input type.\ndiff_binops: A tuple of Zygote-computed derivatives of the binary operators.\ndiff_unaops: A tuple of Zygote-computed derivatives of the unary operators.\n\n\n\n\n\n","category":"type"},{"location":"types/","page":"Types","title":"Types","text":"Construct this operator specification as follows:","category":"page"},{"location":"types/","page":"Types","title":"Types","text":"OperatorEnum(; binary_operators, unary_operators, enable_autodiff)","category":"page"},{"location":"types/#DynamicExpressions.OperatorEnumModule.OperatorEnum-Tuple{}","page":"Types","title":"DynamicExpressions.OperatorEnumModule.OperatorEnum","text":"OperatorEnum(; binary_operators=[], unary_operators=[], enable_autodiff::Bool=false, extend_user_operators::Bool=false)\n\nConstruct an OperatorEnum object, defining the possible expressions. This will also redefine operators for Node types, as well as show, print, and (::Node)(X). It will automatically compute derivatives with Zygote.jl.\n\nArguments\n\nbinary_operators::Vector{Function}: A vector of functions, each of which is a binary operator.\nunary_operators::Vector{Function}: A vector of functions, each of which is a unary operator.\nenable_autodiff::Bool=false: Whether to enable automatic differentiation.\nextend_user_operators::Bool=false: Whether to extend the user's operators to Node types. All operators defined in Base will already be extended automatically.\n\n\n\n\n\n","category":"method"},{"location":"types/","page":"Types","title":"Types","text":"This is just for scalar real operators. However, you can use the following for more general operators:","category":"page"},{"location":"types/","page":"Types","title":"Types","text":"GenericOperatorEnum(; binary_operators=[], unary_operators=[], extend_user_operators::Bool=false)","category":"page"},{"location":"types/#DynamicExpressions.OperatorEnumModule.GenericOperatorEnum-Tuple{}","page":"Types","title":"DynamicExpressions.OperatorEnumModule.GenericOperatorEnum","text":"GenericOperatorEnum(; binary_operators=[], unary_operators=[], extend_user_operators::Bool=false)\n\nConstruct a GenericOperatorEnum object, defining possible expressions. Unlike OperatorEnum, this enum one will work arbitrary operators and data types. This will also redefine operators for Node types, as well as show, print, and (::Node)(X).\n\nArguments\n\nbinary_operators::Vector{Function}: A vector of functions, each of which is a binary operator on real scalars.\nunary_operators::Vector{Function}: A vector of functions, each of which is a unary operator on real scalars.\nextend_user_operators::Bool=false: Whether to extend the user's operators to Node types. All operators defined in Base will already be extended automatically.\n\n\n\n\n\n","category":"method"},{"location":"types/#Equations","page":"Types","title":"Equations","text":"","category":"section"},{"location":"types/","page":"Types","title":"Types","text":"Equations are specified as binary trees with the Node type, defined as follows:","category":"page"},{"location":"types/","page":"Types","title":"Types","text":"Node{T}","category":"page"},{"location":"types/#DynamicExpressions.EquationModule.Node","page":"Types","title":"DynamicExpressions.EquationModule.Node","text":"Node{T}\n\nNode defines a symbolic expression stored in a binary tree. A single Node instance is one \"node\" of this tree, and has references to its children. By tracing through the children nodes, you can evaluate or print a given expression.\n\nFields\n\ndegree::Int: Degree of the node. 0 for constants, 1 for   unary operators, 2 for binary operators.\nconstant::Bool: Whether the node is a constant.\nval::T: Value of the node. If degree==0, and constant==true,   this is the value of the constant. It has a type specified by the   overall type of the Node (e.g., Float64).\nfeature::Int (optional): Index of the feature to use in the   case of a feature node. Only used if degree==0 and constant==false.    Only defined if degree == 0 && constant == false.\nop::Int: If degree==1, this is the index of the operator   in operators.unaops. If degree==2, this is the index of the   operator in operators.binops. In other words, this is an enum   of the operators, and is dependent on the specific OperatorEnum   object. Only defined if degree >= 1\nl::Node{T}: Left child of the node. Only defined if degree >= 1.   Same type as the parent node.\nr::Node{T}: Right child of the node. Only defined if degree == 2.   Same type as the parent node. This is to be passed as the right   argument to the binary operator.\n\n\n\n\n\n","category":"type"},{"location":"types/","page":"Types","title":"Types","text":"There are a variety of constructors for Node objects, including:","category":"page"},{"location":"types/","page":"Types","title":"Types","text":"Node(::Type{T}; val=nothing, feature::Integer=nothing) where {T}\nNode(op::Int, l::Node)\nNode(op::Int, l::Node, r::Node)\nNode(var_string::String)","category":"page"},{"location":"types/#DynamicExpressions.EquationModule.Node-Union{Tuple{Type{T}}, Tuple{T}} where T","page":"Types","title":"DynamicExpressions.EquationModule.Node","text":"Node([::Type{T}]; val=nothing, feature::Int=nothing) where {T}\n\nCreate a leaf node: either a constant, or a variable.\n\nArguments:\n\n::Type{T}, optionally specify the type of the   node, if not already given by the type of   val.\nval, if you are specifying a constant, pass   the value of the constant here.\nfeature::Integer, if you are specifying a variable,   pass the index of the variable here.\n\n\n\n\n\nNode(op::Int, l::Node)\n\nApply unary operator op (enumerating over the order given) to Node l\n\n\n\n\n\nNode(op::Int, l::Node, r::Node)\n\nApply binary operator op (enumerating over the order given) to Nodes l and r\n\n\n\n\n\n","category":"method"},{"location":"types/#DynamicExpressions.EquationModule.Node-Tuple{Int64, Node}","page":"Types","title":"DynamicExpressions.EquationModule.Node","text":"Node(op::Int, l::Node)\n\nApply unary operator op (enumerating over the order given) to Node l\n\n\n\n\n\n","category":"method"},{"location":"types/#DynamicExpressions.EquationModule.Node-Tuple{Int64, Node, Node}","page":"Types","title":"DynamicExpressions.EquationModule.Node","text":"Node(op::Int, l::Node, r::Node)\n\nApply binary operator op (enumerating over the order given) to Nodes l and r\n\n\n\n\n\n","category":"method"},{"location":"types/#DynamicExpressions.EquationModule.Node-Tuple{String}","page":"Types","title":"DynamicExpressions.EquationModule.Node","text":"Node(var_string::String)\n\nCreate a variable node, using the format \"x1\" to mean feature 1\n\n\n\n\n\n","category":"method"},{"location":"types/","page":"Types","title":"Types","text":"When you create an Options object, the operators passed are also re-defined for Node types. This allows you use, e.g., t=Node(; feature=1) * 3f0 to create a tree, so long as * was specified as a binary operator.","category":"page"},{"location":"types/","page":"Types","title":"Types","text":"When using these node constructors, types will automatically be promoted. You can convert the type of a node using convert:","category":"page"},{"location":"types/","page":"Types","title":"Types","text":"convert(::Type{Node{T1}}, tree::Node{T2}) where {T1, T2}","category":"page"},{"location":"types/#Base.convert-Union{Tuple{T2}, Tuple{T1}, Tuple{Type{Node{T1}}, Node{T2}}} where {T1, T2}","page":"Types","title":"Base.convert","text":"convert(::Type{Node{T1}}, n::Node{T2}) where {T1,T2}\n\nConvert a Node{T2} to a Node{T1}. This will recursively convert all children nodes to Node{T1}, using convert(T1, tree.val) at constant nodes.\n\nArguments\n\n::Type{Node{T1}}: Type to convert to.\ntree::Node{T2}: Node to convert.\n\n\n\n\n\n","category":"method"},{"location":"types/","page":"Types","title":"Types","text":"You can set a tree (in-place) with set_node!:","category":"page"},{"location":"types/","page":"Types","title":"Types","text":"set_node!(tree::Node{T}, new_tree::Node{T}) where {T}","category":"page"},{"location":"types/#DynamicExpressions.EquationModule.set_node!-Union{Tuple{T}, Tuple{Node{T}, Node{T}}} where T","page":"Types","title":"DynamicExpressions.EquationModule.set_node!","text":"set_node!(tree::Node{T}, new_tree::Node{T}) where {T}\n\nSet every field of tree equal to the corresponding field of new_tree.\n\n\n\n\n\n","category":"method"},{"location":"types/","page":"Types","title":"Types","text":"You can create a copy of a node with copy_node:","category":"page"},{"location":"types/","page":"Types","title":"Types","text":"copy_node(tree::Node)","category":"page"},{"location":"types/#DynamicExpressions.EquationModule.copy_node-Tuple{Node}","page":"Types","title":"DynamicExpressions.EquationModule.copy_node","text":"copy_node(tree::Node; preserve_topology::Bool=false)\n\nCopy a node, recursively copying all children nodes. This is more efficient than the built-in copy. With preserve_topology=true, this will also preserve linkage between a node and multiple parents, whereas without, this would create duplicate child node copies.\n\n\n\n\n\n","category":"method"}]
}
