module EquationModule

import ..ProgramConstantsModule: CONST_TYPE
import ..OptionsStructModule: Options

################################################################################
# Node defines a symbolic expression stored in a binary tree.
# A single `Node` instance is one "node" of this tree, and
# has references to its children. By tracing through the children
# nodes, you can evaluate or print a given expression.
mutable struct Node{T<:Real}
    degree::Int  # 0 for constant/variable, 1 for cos/sin, 2 for +/* etc.
    constant::Bool  # false if variable
    val::T  # If is a constant, this stores the actual value
    # ------------------- (possibly undefined below)
    feature::Int  # If is a variable (e.g., x in cos(x)), this stores the feature index.
    op::Int  # If operator, this is the index of the operator in options.binary_operators, or options.unary_operators
    l::Node{T}  # Left child node. Only defined for degree=1 or degree=2.
    r::Node{T}  # Right child node. Only defined for degree=2. 

    #################
    ## Constructors:
    #################
    Node(d::Int, c::Bool, v::_T) where {_T<:Real} = new{_T}(d, c, v)
    Node(d::Int, c::Bool, v::_T, f::Int) where {_T<:Real} = new{_T}(d, c, v, f)
    function Node(d::Int, c::Bool, v::_T, f::Int, o::Int, l::Node{_T}) where {_T<:Real}
        return new{_T}(d, c, v, f, o, l)
    end
    function Node(
        d::Int, c::Bool, v::_T, f::Int, o::Int, l::Node{_T}, r::Node{_T}
    ) where {_T<:Real}
        return new{_T}(d, c, v, f, o, l, r)
    end
end
################################################################################

"""
    convert(::Type{Node{T1}}, n::Node{T2}) where {T1,T2}

Convert a `Node{T2}` to a `Node{T1}`.
This will recursively convert all children nodes to `Node{T1}`,
using `convert(T1, tree.val)` at constant nodes.
"""
function Base.convert(::Type{Node{T1}}, tree::Node{T2}) where {T1,T2}
    if T1 == T2
        return tree
    elseif tree.degree == 0
        if tree.constant
            return Node(0, tree.constant, convert(T1, tree.val))
        else
            return Node(0, tree.constant, convert(T1, tree.val), tree.feature)
        end
    elseif tree.degree == 1
        l = convert(Node{T1}, tree.l)
        return Node(1, tree.constant, convert(T1, tree.val), tree.feature, tree.op, l)
    else
        l = convert(Node{T1}, tree.l)
        r = convert(Node{T1}, tree.r)
        return Node(2, tree.constant, convert(T1, tree.val), tree.feature, tree.op, l, r)
    end
end

"""
    Node(; val::Real=nothing, feature::Integer=nothing)

Create a leaf node: either a constant, or a variable.

# Arguments:

- `val::Real`, if you are specifying a constant, pass
    the value of the constant here.
- `feature::Integer`, if you are specifying a variable,
    pass the index of the variable here.
"""
function Node(;
    val::T1=nothing, feature::T2=nothing
)::Node where {T1<:Union{Real,Nothing},T2<:Union{Integer,Nothing}}
    if T1 <: Nothing && T2 <: Nothing
        error("You must specify either `val` or `feature` when creating a leaf node.")
    elseif !(T1 <: Nothing || T2 <: Nothing)
        error(
            "You must specify either `val` or `feature` when creating a leaf node, not both.",
        )
    elseif T2 <: Nothing
        return Node(0, true, val)
    else
        return Node(0, false, convert(CONST_TYPE, 0), feature)
    end
end
function Node(
    ::Type{T}; val::T1=nothing, feature::T2=nothing
)::Node{T} where {T<:Real,T1<:Union{Real,Nothing},T2<:Union{Integer,Nothing}}
    return convert(Node{T}, Node(; val=val, feature=feature))
end

"""
    Node(op::Int, l::Node)

Apply unary operator `op` (enumerating over the order given) to `Node` `l`
"""
Node(op::Int, l::Node{T}) where {T} = Node(1, false, convert(T, 0), 0, op, l)

"""
    Node(op::Int, l::Node, r::Node)

Apply binary operator `op` (enumerating over the order given) to `Node`s `l` and `r`
"""
function Node(op::Int, l::Node{T1}, r::Node{T2}) where {T1<:Real,T2<:Real}
    # Get highest type:
    T = promote_type(T1, T2)
    l = convert(Node{T}, l)
    r = convert(Node{T}, r)
    return Node(2, false, convert(T, 0), 0, op, l, r)
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
    copy_node(tree::Node)

Copy a node, recursively copying all children nodes.
This is more efficient than the built-in copy.
"""
function copy_node(tree::Node{T})::Node{T} where {T}
    if tree.degree == 0
        if tree.constant
            return Node(; val=copy(tree.val))
        else
            return Node(T; feature=copy(tree.feature))
        end
    elseif tree.degree == 1
        return Node(copy(tree.op), copy_node(tree.l))
    else
        return Node(copy(tree.op), copy_node(tree.l), copy_node(tree.r))
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
    options::Options;
    bracketed::Bool=false,
    varMap::Union{Array{String,1},Nothing}=nothing,
)::String where {F}
    op_name = get_op_name(string(op))
    if op_name in ["+", "-", "*", "/", "^"]
        l = string_tree(tree.l, options; bracketed=false, varMap=varMap)
        r = string_tree(tree.r, options; bracketed=false, varMap=varMap)
        if bracketed
            return "$l $op_name $r"
        else
            return "($l $op_name $r)"
        end
    else
        l = string_tree(tree.l, options; bracketed=true, varMap=varMap)
        r = string_tree(tree.r, options; bracketed=true, varMap=varMap)
        return "$op_name($l, $r)"
    end
end

"""
    string_tree(tree::Node, options::Options; kws...)

Convert an equation to a string.

# Arguments

- `varMap::Union{Array{String, 1}, Nothing}=nothing`: what variables
    to print for each feature.
"""
function string_tree(
    tree::Node,
    options::Options;
    bracketed::Bool=false,
    varMap::Union{Array{String,1},Nothing}=nothing,
)::String
    if tree.degree == 0
        if tree.constant
            return string(tree.val)
        else
            if varMap === nothing
                return "x$(tree.feature)"
            else
                return varMap[tree.feature]
            end
        end
    elseif tree.degree == 1
        op_name = get_op_name(string(options.unaops[tree.op]))
        return "$(op_name)($(string_tree(tree.l, options, bracketed=true, varMap=varMap)))"
    else
        return string_op(
            options.binops[tree.op], tree, options; bracketed=bracketed, varMap=varMap
        )
    end
end

# Print an equation
function print_tree(
    io::IO, tree::Node, options::Options; varMap::Union{Array{String,1},Nothing}=nothing
)
    return println(io, string_tree(tree, options; varMap=varMap))
end

function print_tree(
    tree::Node, options::Options; varMap::Union{Array{String,1},Nothing}=nothing
)
    return println(string_tree(tree, options; varMap=varMap))
end

function Base.hash(tree::Node)::UInt
    if tree.degree == 0
        if tree.constant
            # tree.val used.
            return hash((0, tree.val))
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

end
