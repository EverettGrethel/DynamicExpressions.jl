import Base:
    map,
    mapreduce,
    any,
    collect,
    iterate,
    length,
    filter,
    getindex,
    setindex!,
    firstindex,
    lastindex

"""
    mapreduce(f::Function, op::Function, tree::Node)

Map a function over a tree and aggregate the result using an operator `op`.
The operator will take the result of `f` on the current node, as well
as on the left node. For binary nodes, `op` will receive the result of
`f` on the current node, and both the left and right nodes (three arguments).
In other words, you may define the function signature of `op` to be `(parent, child...)`
for between 1 and 2 children.

# Examples
```jldoctest
julia> operators = OperatorEnum(; binary_operators=[+, *]);

julia> tree = Node(; feature=1) + Node(; feature=2) * 3.2;

julia> mapreduce(t -> 1, +, tree)  # count nodes
5

julia> mapreduce(vcat, tree) do t
    t.degree == 2 ? [t.op] : Int[]
end  # Get list of binary operators used
2-element Vector{Int64}:
 1
 2

julia> mapreduce(vcat, tree) do t
    (t.degree == 0 && t.constant) ? [t.val] : Float64[]
end  # Get list of constants
1-element Vector{Float64}:
 3.2
```
"""
function mapreduce(f::F, op::G, tree::Node) where {F<:Function,G<:Function}
    if tree.degree == 0
        return @inline(f(tree))
    elseif tree.degree == 1
        return op(@inline(f(tree)), mapreduce(f, op, tree.l))
    else
        return op(@inline(f(tree)), mapreduce(f, op, tree.l), mapreduce(f, op, tree.r))
    end
end

function _mapfilter(f::F, post::G, tree::Node{T}, stack::Vector{GT}) where {F<:Function,G<:Function,GT,T}
    @inline(f(tree)) && push!(stack, @inline(post(tree)))
    if tree.degree == 1
        _mapfilter(f, post, tree.l, stack)
    elseif tree.degree == 2
        _mapfilter(f, post, tree.l, stack)
        _mapfilter(f, post, tree.r, stack)
    end
    return nothing
end
function mapfilter(f::F, post::G, tree::Node{T}, ::Type{GT}=Any) where {F<:Function,G<:Function,GT,T}
    stack = GT[]
    _mapfilter(f, post, tree, stack)
    return stack::Vector{GT}
end

"""
    any(f::Function, tree::Node)

Reduce a flag function over a tree, returning `true` if the function returns `true` for any node.
By using this instead of mapreduce, we can lazily traverse the tree.
"""
function any(f::F, tree::Node) where {F<:Function}
    if tree.degree == 0
        return @inline(f(tree))::Bool
    elseif tree.degree == 1
        return @inline(f(tree))::Bool || any(f, tree.l)
    else
        return @inline(f(tree))::Bool || any(f, tree.l) || any(f, tree.r)
    end
end

################################
###### DERIVED FUNCTIONS: ######
################################

"""
    filter(f::Function, tree::Node)

Filter nodes of a tree, returning a flat array of the nodes for which the function returns `true`.
"""
filter(f::F, tree::Node{T}) where {F<:Function,T} = mapfilter(f, t -> t, tree, Node{T})

collect(tree::Node) = filter(Returns(true), tree)

"""
    map(f::Function, tree::Node{T})

Map a function over a tree and return a flat array of the results in depth-first order.
"""
map(f::F, tree::Node) where {F<:Function} = f.(collect(tree))
all(f::F, tree::Node) where {F<:Function} = !any(t -> !@inline(f(t)), tree)
getindex(tree::Node, i::Int) = collect(tree)[i]
iterate(root::Node) = (root, collect(root)[(begin + 1):end])
iterate(_, stack) = isempty(stack) ? nothing : (popfirst!(stack), stack)
length(tree::Node) = mapreduce(_ -> 1, +, tree)
firstindex(::Node) = 1
lastindex(tree::Node) = length(tree)
setindex!(::Node, _, ::Int) = error("Cannot setindex! on a tree. Use `set_node!` instead.")
