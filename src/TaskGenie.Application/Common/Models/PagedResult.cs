namespace TaskGenie.Application.Common.Models;

public sealed class PagedResult<T>
{
    public IReadOnlyList<T> Items { get; init; } = Array.Empty<T>();
    public int TotalCount { get; init; }
    public int Page { get; init; }
    public int PageSize { get; init; }

    public static PagedResult<T> Create(IEnumerable<T> all, int page, int pageSize)
    {
        page = page < 1 ? 1 : page;
        pageSize = pageSize is < 1 or > 200 ? 20 : pageSize;

        var list = all.ToList();
        var items = list.Skip((page - 1) * pageSize).Take(pageSize).ToList();

        return new PagedResult<T>
        {
            Items = items,
            TotalCount = list.Count,
            Page = page,
            PageSize = pageSize
        };
    }
}
