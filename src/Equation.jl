module EquationModule

import ..OperatorEnumModule: AbstractOperatorEnum
import ..UtilsModule: @generate_idmap, @use_idmap

const DEFAULT_NODE_TYPE = Float32

"""
    Node{T}

Node defines a symbolic expression stored in a binary tree.
A single `Node` instance is one "node" of this tree, and
has references to its children. By tracing through the children
nodes, you can evaluate or print a given expression.

# Fields

- `degree::Int`: Degree of the node. 0 for constants, 1 for
    unary operators, 2 for binary operators.
- `constant::Bool`: Whether the node is a constant.
- `val::T`: Value of the node. If `degree==0`, and `constant==true`,
    this is the value of the constant. It has a type specified by the
    overall type of the `Node` (e.g., `Float64`).
- `feature::Int` (optional): Index of the feature to use in the
    case of a feature node. Only used if `degree==0` and `constant==false`. 
    Only defined if `degree == 0 && constant == false`.
- `op::Int`: If `degree==1`, this is the index of the operator
    in `operators.unaops`. If `degree==2`, this is the index of the
    operator in `operators.binops`. In other words, this is an enum
    of the operators, and is dependent on the specific `OperatorEnum`
    object. Only defined if `degree >= 1`
- `l::Node{T}`: Left child of the node. Only defined if `degree >= 1`.
    Same type as the parent node.
- `r::Node{T}`: Right child of the node. Only defined if `degree == 2`.
    Same type as the parent node. This is to be passed as the right
    argument to the binary operator.
"""
mutable struct Node{T}
    degree::Int  # 0 for constant/variable, 1 for cos/sin, 2 for +/* etc.
    constant::Bool  # false if variable
    val::Union{T,Nothing}  # If is a constant, this stores the actual value
    # ------------------- (possibly undefined below)
    feature::Int  # If is a variable (e.g., x in cos(x)), this stores the feature index.
    op::Int  # If operator, this is the index of the operator in operators.binary_operators, or operators.unary_operators
    l::Node{T}  # Left child node. Only defined for degree=1 or degree=2.
    r::Node{T}  # Right child node. Only defined for degree=2. 

    #################
    ## Constructors:
    #################
    Node(d::Int, c::Bool, v::_T) where {_T} = new{_T}(d, c, v)
    Node(::Type{_T}, d::Int, c::Bool, v::_T) where {_T} = new{_T}(d, c, v)
    Node(::Type{_T}, d::Int, c::Bool, v::Nothing, f::Int) where {_T} = new{_T}(d, c, v, f)
    function Node(d::Int, c::Bool, v::Nothing, f::Int, o::Int, l::Node{_T}) where {_T}
        return new{_T}(d, c, v, f, o, l)
    end
    function Node(
        d::Int, c::Bool, v::Nothing, f::Int, o::Int, l::Node{_T}, r::Node{_T}
    ) where {_T}
        return new{_T}(d, c, v, f, o, l, r)
    end
end
################################################################################

include("tree_map.jl")

"""
    convert(::Type{Node{T1}}, n::Node{T2}) where {T1,T2}

Convert a `Node{T2}` to a `Node{T1}`.
This will recursively convert all children nodes to `Node{T1}`,
using `convert(T1, tree.val)` at constant nodes.

# Arguments
- `::Type{Node{T1}}`: Type to convert to.
- `tree::Node{T2}`: Node to convert.
"""
function Base.convert(
    ::Type{Node{T1}}, tree::Node{T2}; preserve_sharing::Bool=false
) where {T1,T2}
    if T1 == T2
        return tree
    end
    if preserve_sharing
        @use_idmap(_convert(Node{T1}, tree), IdDict{Node{T2},Node{T1}}())
    else
        _convert(Node{T1}, tree)
    end
end

@generate_idmap tree function _convert(::Type{Node{T1}}, tree::Node{T2}) where {T1,T2}
    if tree.degree == 0
        if tree.constant
            val = tree.val::T2
            if !(T2 <: T1)
                # e.g., we don't want to convert Float32 to Union{Float32,Vector{Float32}}!
                val = convert(T1, val)
            end
            Node(T1, 0, tree.constant, val)
        else
            Node(T1, 0, tree.constant, nothing, tree.feature)
        end
    elseif tree.degree == 1
        l = _convert(Node{T1}, tree.l)
        Node(1, tree.constant, nothing, tree.feature, tree.op, l)
    else
        l = _convert(Node{T1}, tree.l)
        r = _convert(Node{T1}, tree.r)
        Node(2, tree.constant, nothing, tree.feature, tree.op, l, r)
    end
end

"""
    Node([::Type{T}]; val=nothing, feature::Int=nothing) where {T}

Create a leaf node: either a constant, or a variable.

# Arguments:

- `::Type{T}`, optionally specify the type of the
    node, if not already given by the type of
    `val`.
- `val`, if you are specifying a constant, pass
    the value of the constant here.
- `feature::Integer`, if you are specifying a variable,
    pass the index of the variable here.
"""
function Node(;
    val::T1=nothing, feature::T2=nothing
)::Node where {T1,T2<:Union{Integer,Nothing}}
    if T1 <: Nothing && T2 <: Nothing
        error("You must specify either `val` or `feature` when creating a leaf node.")
    elseif !(T1 <: Nothing || T2 <: Nothing)
        error(
            "You must specify either `val` or `feature` when creating a leaf node, not both.",
        )
    elseif T2 <: Nothing
        return Node(0, true, val)
    else
        return Node(DEFAULT_NODE_TYPE, 0, false, nothing, feature)
    end
end
function Node(
    ::Type{T}; val::T1=nothing, feature::T2=nothing
)::Node{T} where {T,T1,T2<:Union{Integer,Nothing}}
    if T1 <: Nothing && T2 <: Nothing
        error("You must specify either `val` or `feature` when creating a leaf node.")
    elseif !(T1 <: Nothing || T2 <: Nothing)
        error(
            "You must specify either `val` or `feature` when creating a leaf node, not both.",
        )
    elseif T2 <: Nothing
        if !(T1 <: T)
            # Only convert if not already in the type union.
            val = convert(T, val)
        end
        return Node(T, 0, true, val)
    else
        return Node(T, 0, false, nothing, feature)
    end
end

"""
    Node(op::Int, l::Node)

Apply unary operator `op` (enumerating over the order given) to `Node` `l`
"""
Node(op::Int, l::Node{T}) where {T} = Node(1, false, nothing, 0, op, l)

"""
    Node(op::Int, l::Node, r::Node)

Apply binary operator `op` (enumerating over the order given) to `Node`s `l` and `r`
"""
function Node(op::Int, l::Node{T1}, r::Node{T2}) where {T1,T2}
    # Get highest type:
    if T1 != T2
        T = promote_type(T1, T2)
        l = convert(Node{T}, l)
        r = convert(Node{T}, r)
    end
    return Node(2, false, nothing, 0, op, l, r)
end

"""
    Node(var_string::String)

Create a variable node, using the format `"x1"` to mean feature 1
"""
Node(var_string::String) = Node(; feature=parse(Int, var_string[2:end]))

"""
    Node(var_string::String, varMap::Array{String, 1})

Create a variable node, using a user-passed format
"""
function Node(var_string::String, varMap::Array{String,1})
    return Node(;
        feature=[
            i for (i, _variable) in enumerate(varMap) if _variable == var_string
        ][1]::Int,
    )
end

"""
    set_node!(tree::Node{T}, new_tree::Node{T}) where {T}

Set every field of `tree` equal to the corresponding field of `new_tree`.
"""
function set_node!(tree::Node{T}, new_tree::Node{T}) where {T}
    tree.degree = new_tree.degree
    if new_tree.degree == 0
        tree.constant = new_tree.constant
        if new_tree.constant
            tree.val = new_tree.val::T
        else
            tree.feature = new_tree.feature
        end
    else
        tree.op = new_tree.op
        tree.l = new_tree.l
        if new_tree.degree == 2
            tree.r = new_tree.r
        end
    end
    return nothing
end

"""
    copy_node(tree::Node; preserve_sharing::Bool=false)

Copy a node, recursively copying all children nodes.
This is more efficient than the built-in copy.
With `preserve_sharing=true`, this will also
preserve linkage between a node and
multiple parents, whereas without, this would create
duplicate child node copies.

id_map is a map from `objectid(tree)` to `copy(tree)`.
We check against the map before making a new copy; otherwise
we can simply reference the existing copy.
[Thanks to Ted Hopp.](https://stackoverflow.com/questions/49285475/how-to-copy-a-full-non-binary-tree-including-loops)

Note that this will *not* preserve loops in graphs.
"""
function copy_node(tree::Node{T}; preserve_sharing::Bool=false)::Node{T} where {T}
    if preserve_sharing
        @use_idmap(_copy_node(tree), IdDict{Node{T},Node{T}}())
    else
        _copy_node(tree)
    end
end

@generate_idmap tree function _copy_node(tree::Node{T})::Node{T} where {T}
    if tree.degree == 0
        if tree.constant
            Node(; val=copy(tree.val::T))
        else
            Node(T; feature=copy(tree.feature))
        end
    elseif tree.degree == 1
        Node(copy(tree.op), _copy_node(tree.l))
    else
        Node(copy(tree.op), _copy_node(tree.l), _copy_node(tree.r))
    end
end

const OP_NAMES = Dict(
    "safe_log" => "log",
    "safe_log2" => "log2",
    "safe_log10" => "log10",
    "safe_log1p" => "log1p",
    "safe_acosh" => "acosh",
    "safe_sqrt" => "sqrt",
    "safe_pow" => "^",
)

function get_op_name(op::String)
    return get(OP_NAMES, op, op)
end

function string_op(
    op::F,
    tree::Node,
    operators::AbstractOperatorEnum;
    bracketed::Bool=false,
    varMap::Union{Array{String,1},Nothing}=nothing,
)::String where {F}
    op_name = get_op_name(string(op))
    if op_name in ["+", "-", "*", "/", "^"]
        l = string_tree(tree.l, operators; bracketed=false, varMap=varMap)
        r = string_tree(tree.r, operators; bracketed=false, varMap=varMap)
        if bracketed
            return "$l $op_name $r"
        else
            return "($l $op_name $r)"
        end
    else
        l = string_tree(tree.l, operators; bracketed=true, varMap=varMap)
        r = string_tree(tree.r, operators; bracketed=true, varMap=varMap)
        return "$op_name($l, $r)"
    end
end

"""
    string_tree(tree::Node, operators::AbstractOperatorEnum; kws...)

Convert an equation to a string.

# Arguments

- `varMap::Union{Array{String, 1}, Nothing}=nothing`: what variables
    to print for each feature.
"""
function string_tree(
    tree::Node{T},
    operators::AbstractOperatorEnum;
    bracketed::Bool=false,
    varMap::Union{Array{String,1},Nothing}=nothing,
)::String where {T}
    if tree.degree == 0
        if tree.constant
            return string_constant(tree.val::T; bracketed=bracketed)
        else
            if varMap === nothing
                return "x$(tree.feature)"
            else
                return varMap[tree.feature]
            end
        end
    elseif tree.degree == 1
        op_name = get_op_name(string(operators.unaops[tree.op]))
        return "$(op_name)($(string_tree(tree.l, operators, bracketed=true, varMap=varMap)))"
    else
        return string_op(
            operators.binops[tree.op], tree, operators; bracketed=bracketed, varMap=varMap
        )
    end
end

string_constant(val::T; bracketed::Bool) where {T<:Union{Real,AbstractArray}} = string(val)
function string_constant(val; bracketed::Bool)
    if bracketed
        string(val)
    else
        "(" * string(val) * ")"
    end
end

# Print an equation
function print_tree(
    io::IO,
    tree::Node,
    operators::AbstractOperatorEnum;
    varMap::Union{Array{String,1},Nothing}=nothing,
)
    return println(io, string_tree(tree, operators; varMap=varMap))
end

function print_tree(
    tree::Node,
    operators::AbstractOperatorEnum;
    varMap::Union{Array{String,1},Nothing}=nothing,
)
    return println(string_tree(tree, operators; varMap=varMap))
end

function Base.hash(tree::Node{T})::UInt where {T}
    if tree.degree == 0
        if tree.constant
            # tree.val used.
            return hash((0, tree.val::T))
        else
            # tree.feature used.
            return hash((1, tree.feature))
        end
    elseif tree.degree == 1
        return hash((1, tree.op, hash(tree.l)))
    else
        return hash((2, tree.op, hash(tree.l), hash(tree.r)))
    end
end

function is_equal(a::Node{T}, b::Node{T})::Bool where {T}
    if a.degree == 0
        b.degree != 0 && return false
        if a.constant
            !(b.constant) && return false
            return a.val::T == b.val::T
        else
            b.constant && return false
            return a.feature == b.feature
        end
    elseif a.degree == 1
        b.degree != 1 && return false
        a.op != b.op && return false
        return is_equal(a.l, b.l)
    else
        b.degree != 2 && return false
        a.op != b.op && return false
        return is_equal(a.l, b.l) && is_equal(a.r, b.r)
    end
end

function Base.:(==)(a::Node{T}, b::Node{T})::Bool where {T}
    return is_equal(a, b)
end

function Base.:(==)(a::Node{T1}, b::Node{T2})::Bool where {T1,T2}
    T = promote_type(T1, T2)
    # TODO: Should also have preserve_sharing check...
    return is_equal(convert(Node{T}, a), convert(Node{T}, b))
end

end
